export default function SandboxPanel() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="text-terminal-accent text-sm mb-3">
        .: sandbox
      </div>
      <div className="border border-terminal-border/50 rounded h-48 flex items-center justify-center">
        <div className="text-center">
          <div className="text-terminal-dim text-xs mb-2">
            .: mini-app will render here
          </div>
          <div className="text-terminal-border text-[10px]">
            powered by Cloudflare Workers
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        <div className="text-terminal-dim text-xs">.: dependencies</div>
        <div className="text-terminal-dim text-xs pl-3">.: analyzing...</div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="text-terminal-dim text-xs">.: architecture</div>
        <div className="text-terminal-dim text-xs pl-3">.: waiting for analysis...</div>
      </div>
    </div>
  )
}
