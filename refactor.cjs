const fs = require('fs');

let content = fs.readFileSync('src/components/tv/ScreenShareTransmitter.tsx', 'utf-8');

content = content.replace('export default function Broadcast()', 'export function ScreenShareTransmitter()');

content = content.replace(
  '<div className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center justify-center">',
  '<div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center mt-6">'
);
content = content.replace(
  '<div className="max-w-4xl w-full space-y-8">',
  '<div className="w-full space-y-6">'
);

content = content.replace(
  '<h1 className="text-4xl font-bold mb-4">Transmissão para a TV</h1>',
  '<h3 className="text-xl font-bold mb-2">Transmissão para a TV</h3>'
);
content = content.replace(
  '<p className="text-slate-400">',
  '<p className="text-muted-foreground text-sm">'
);
content = content.replace(
  '<div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg aspect-video relative flex items-center justify-center">',
  '<div className="bg-black border border-border rounded-xl overflow-hidden shadow-md aspect-video relative flex items-center justify-center">'
);
content = content.replace(
  `<div className="text-center p-8">
              <MonitorUp className="w-24 h-24 mx-auto text-slate-700 mb-4" />
              <p className="text-xl font-medium text-slate-500">Nenhuma transmissão ativa</p>
            </div>`,
  `<div className="text-center p-8">
              <MonitorUp className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-base font-medium text-slate-400">Nenhuma transmissão ativa</p>
            </div>`
);

content = content.replace(
  `  if (!user || !selectedUnit) {
    return <div className="p-8 text-white">Selecione uma unidade primeiro.</div>;
  }`,
  ``
);

fs.writeFileSync('src/components/tv/ScreenShareTransmitter.tsx', content, 'utf-8');
