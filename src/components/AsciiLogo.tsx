const logo = `
 ███████╗██████╗ ███████╗███████╗ ██████╗██╗  ██╗██████╗ ██╗   ██╗███╗   ██╗
 ██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝██║  ██║██╔══██╗██║   ██║████╗  ██║
 ███████╗██████╔╝█████╗  █████╗  ██║     ███████║██████╔╝██║   ██║██╔██╗ ██║
 ╚════██║██╔═══╝ ██╔══╝  ██╔══╝  ██║     ██╔══██║██╔══██╗██║   ██║██║╚██╗██║
 ███████║██║     ███████╗███████╗╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚████║
 ╚══════╝╚═╝     ╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝`

export default function AsciiLogo() {
  return (
    <div className="px-6 py-4">
      <div className="text-terminal-text text-sm mb-2">
        <span className="text-terminal-accent">~ $</span> npx @speechrun/cli@latest
      </div>
      <pre className="text-terminal-bright text-[10px] leading-tight sm:text-xs">
        {logo}
      </pre>
      <div className="text-terminal-dim text-xs mt-2">
        v0.1.0 · let your code do the talking · Cloudflare x ElevenLabs
      </div>
    </div>
  )
}
