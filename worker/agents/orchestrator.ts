import { Agent, callable } from 'agents'
import type { Env, OrchestratorState, ContextData, GenerationResult } from '../types'
import { parseGithubUrl, fetchRepoMetadata, fetchFileTree, fetchMultipleFiles } from '../utils/github-client'
import { selectKeyFiles } from '../utils/file-selector'

export class Orchestrator extends Agent<Env, OrchestratorState> {
  initialState: OrchestratorState = {
    repoUrl: '',
    status: 'idle',
    context: null,
    turns: [],
    error: null,
  }

  @callable()
  async startGeneration(repoUrl: string): Promise<GenerationResult> {
    try {
      this.setState({ ...this.state, repoUrl, status: 'fetching', error: null, turns: [] })

      // Step 1: Parse and validate GitHub URL
      const { owner, repo } = parseGithubUrl(repoUrl)

      // Step 2: Fetch repo metadata
      const metadata = await fetchRepoMetadata(owner, repo, this.env.GITHUB_TOKEN)

      // Step 3: Fetch file tree
      const fileTree = await fetchFileTree(owner, repo, metadata.defaultBranch, this.env.GITHUB_TOKEN)

      // Step 4: Select key files
      const selectedFiles = selectKeyFiles(fileTree)

      // Step 5: Fetch file contents
      const keyFiles = await fetchMultipleFiles(owner, repo, selectedFiles, this.env.GITHUB_TOKEN)

      this.setState({ ...this.state, status: 'analyzing' })

      // Step 6: Generate context via Workers AI
      const context = await this.generateContext(metadata, fileTree, keyFiles)

      this.setState({ ...this.state, context, status: 'idle' })

      return { success: true, turnCount: 0 }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.setState({ ...this.state, status: 'error', error: message })
      return { success: false, turnCount: 0, error: message }
    }
  }

  private async generateContext(
    metadata: { fullName: string; description: string; language: string; stargazersCount: number },
    fileTree: string[],
    keyFiles: Record<string, string>,
  ): Promise<ContextData> {
    const fileContentsStr = Object.entries(keyFiles)
      .map(([path, content]) => `--- ${path} ---\n${content}`)
      .join('\n\n')

    // Truncate total context to ~30K chars to stay within LLM limits
    const truncatedContents = fileContentsStr.length > 30000
      ? fileContentsStr.slice(0, 30000) + '\n\n... (truncated)'
      : fileContentsStr

    const prompt = `Analyze this GitHub repository and provide a structured summary for a podcast discussion.

Repository: ${metadata.fullName}
Description: ${metadata.description}
Primary Language: ${metadata.language}
Stars: ${metadata.stargazersCount}
Total Files: ${fileTree.length}

File Tree (first 100):
${fileTree.slice(0, 100).join('\n')}

Key File Contents:
${truncatedContents}

Provide a concise analysis covering:
1. What the project does (1-2 sentences)
2. Architecture and key patterns
3. Technology choices and why they make sense
4. Code quality observations
5. Most interesting or notable aspects
6. Potential areas for improvement

Keep the analysis focused and opinionated — this will fuel a PM vs Developer debate podcast.`

    const response = await this.env.AI.run(
      // Model identifier — Workers AI routes to the correct model
      '@cf/meta/llama-3.1-70b-instruct' as keyof AiModels,
      {
        messages: [
          { role: 'system', content: 'You are an expert code analyst. Provide concise, opinionated analysis.' },
          { role: 'user', content: prompt },
        ],
      } as Record<string, unknown>,
    )

    const summary = typeof response === 'object' && 'response' in response
      ? (response as { response: string }).response
      : String(response)

    return {
      summary,
      repoName: metadata.fullName,
      fileTree: fileTree.slice(0, 100),
      keyFiles,
      generatedAt: new Date().toISOString(),
    }
  }
}
