const logo = `
 ███████╗██████╗ ███████╗███████╗ ██████╗██╗  ██╗██████╗ ██╗   ██╗███╗   ██╗
 ██╔════╝██╔══██╗██╔════╝██╔════╝██╔════╝██║  ██║██╔══██╗██║   ██║████╗  ██║
 ███████╗██████╔╝█████╗  █████╗  ██║     ███████║██████╔╝██║   ██║██╔██╗ ██║
 ╚════██║██╔═══╝ ██╔══╝  ██╔══╝  ██║     ██╔══██║██╔══██╗██║   ██║██║╚██╗██║
 ███████║██║     ███████╗███████╗╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚████║
 ╚══════╝╚═╝     ╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝`

export default function AsciiLogo() {
  return (
    <div className="px-6 py-4 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-[#f6821f08] via-transparent to-[#f6821f04] pointer-events-none" />
      <div className="text-terminal-text text-sm mb-2 relative">
        <span className="text-terminal-accent">~ $</span> npx @speechrun/cli@latest
      </div>
      <pre className="text-terminal-accent/80 text-[10px] leading-tight sm:text-xs relative">
        {logo}
      </pre>
      <div className="text-terminal-dim text-xs mt-2 relative">
        v0.1.0 · let your code do the talking · <span className="text-terminal-accent/70">Cloudflare</span> x <span className="text-terminal-accent/70">ElevenLabs</span>
      </div>
    </div>
  )
}
