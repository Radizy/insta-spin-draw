import re

with open('src/pages/TV.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy, MonitorPlay } from 'lucide-react';", "import { User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy } from 'lucide-react';")

# 2. States
state_block = """  // Screen Share States
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [broadcastAvailable, setBroadcastAvailable] = useState(false);"""
new_state_block = """  // Screen Share States
  const [broadcastAvailable, setBroadcastAvailable] = useState(false);"""
content = content.replace(state_block, new_state_block)

# 3. Transmissao Slide Type
map_case_end = """          );
        }
        default: return null;"""
new_map_case_end = """          );
        }
        case 'transmissao': return <ScreenShareReceiver isActive={isActive} onStreamAvailable={setBroadcastAvailable} />;
        default: return null;"""
content = content.replace(map_case_end, new_map_case_end)

# 4. Remove Let Media logic
media_block = """    let media;
    if (screenShareActive) {
      media = <ScreenShareReceiver isActive={isActive} onStreamAvailable={setBroadcastAvailable} />;
    } else {
      media = renderMedia();
    }

    // Se exibir_fila_tv estiver ativo e não for o slide nativo de rank, mescla a fila lateral
    if (unidadeData?.exibir_fila_tv && (screenShareActive || slide.tipo !== 'top_rank')) {"""
new_media_block = """    const media = renderMedia();

    // Se exibir_fila_tv estiver ativo e não for o slide nativo de rank, mescla a fila lateral
    if (unidadeData?.exibir_fila_tv && slide.tipo !== 'top_rank') {"""
# the original text might have 'não' or 'nÃ£o', so let's use regex
content = re.sub(
    r"    let media;\n    if \(screenShareActive\) \{\n      media = <ScreenShareReceiver isActive=\{isActive\} onStreamAvailable=\{setBroadcastAvailable\} />;\n    \} else \{\n      media = renderMedia\(\);\n    \}\n\n    // Se exibir_fila_tv estiver ativo e n[^\s]+ for o slide nativo de rank, mescla a fila lateral\n    if \(unidadeData\?\.exibir_fila_tv && \(screenShareActive \|\| slide\.tipo !== 'top_rank'\)\) \{",
    r"    const media = renderMedia();\n\n    // Se exibir_fila_tv estiver ativo e não for o slide nativo de rank, mescla a fila lateral\n    if (unidadeData?.exibir_fila_tv && slide.tipo !== 'top_rank') {",
    content
)

# 5. Header Button
button_block = """        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setScreenShareActive(!screenShareActive)} 
            variant={screenShareActive ? "default" : "outline"}
            className={`gap-2 ${screenShareActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            title="Ativar/Desativar Recebimento de Transmissão"
          >
            <MonitorPlay className={`w-5 h-5 ${broadcastAvailable && !screenShareActive ? 'animate-pulse text-emerald-500' : ''}`} /> 
            Transmissão {screenShareActive ? 'Ativa' : ''}
          </Button>
          <Button onClick={() => setCheckinOpen(true)} variant="outline" className="gap-2"><UserPlus className="w-5 h-5" /> Check-in</Button>"""

new_button_block = """        <div className="flex items-center gap-4">
          <Button onClick={() => setCheckinOpen(true)} variant="outline" className="gap-2"><UserPlus className="w-5 h-5" /> Check-in</Button>"""
content = content.replace(button_block, new_button_block)

with open('src/pages/TV.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
