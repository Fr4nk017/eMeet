"use client";
import { useState, useEffect } from 'react';
import { HiPaperAirplane, HiChatBubbleLeftRight, HiInformationCircle, HiXMark } from 'react-icons/hi2';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../src/components/Layout';
import { useAuth } from '../../src/context/AuthContext';
// --- MOCK DATA INICIAL ---
const CHATS_COMUNIDAD = [
  {
    id: 'group-fiesta-01',
    name: 'Fiesta Bellavista 2026',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
    category: 'fiesta',
    description: 'La fiesta oficial del semestre para informática. Música urbana y electrónica.',
    participants: ['Papi micky', 'Bryan', 'Tony Stark', 'Marco Polo'],
    initialMsg: { user: 'Papi micky', text: 'me saco uno kbros que saen, nos vemo PAH' }
  },
  {
    id: 'group-networking-03',
    name: 'Networking Informática Duoc',
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b',
    category: 'networking',
    description: 'Espacio para compartir repositorios, ofertas laborales y dudas de Spring Boot.',
    participants: ['Marco Polo', 'Francisco', 'Bryan', 'Cristofer'],
    initialMsg: { user: 'Marco Polo', text: 'sus pubg??' }
  }
];

const MIS_EVENTOS_MOCK = [
  {
    id: 'group-musica-02',
    name: 'Concierto Jazz Live',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629',
    category: 'musica',
    description: 'Sesión de Jazz en vivo, Cal y Canto.',
    participants: ['Tony Stark', 'Francisco', 'Camiroagua'],
    initialMsg: { user: 'Tony Stark de rancagua', text: 'consigan mano ijos de la jarvis' }
  }
];

export default function ChatPage() {
  const [tab, setTab] = useState<'comunidad' | 'eventos'>('comunidad');
  const [chatSeleccionado, setChatSeleccionado] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [historialMensajes, setHistorialMensajes] = useState<Record<string, any[]>>({
    'group-fiesta-01': [{ user: 'Papi micky', text: 'me saco uno kbros que saen PAH', isMe: false }],
    'group-networking-03': [{ user: 'Marco Polo', text: 'sus pubg??', isMe: false }],
    'group-musica-02': [{ user: 'Tony Stark de rancagua', text: 'consigan mano ijos de la jarvis', isMe: false }]
  });

const { user } = useAuth(); /// Obtenemos el usuario activo del contexto

const enviarMensaje = () => {
  if (!input.trim() || !chatSeleccionado) return;

  /// Mapeo dinámico basado en los users de Supabase
  const obtenerNombreReal = (email: string | undefined) => {
    const usuarios = {
      'br.oyarce@duocuc.cl': 'Brayan',
      'danibravo@duoc.cl': 'Dani Bravo',
      'este@duoc.cl': 'Esteban',
      'jefe@gmail.com': 'polla',
      'juan@gmail.com': 'juan',
      'locatario_de_prueba@gmail.com': 'el voyerista',
      'locatario1@gmail.com': 'el nano',
      'lol@gmail.com': 'restaurant 1',
      'peter@gmail.com': 'hee',
      'prueba@gmail.com': 'touchmee',
      'u@gmail.com': 'usuario22',
      'carewue@gmail.com': 'el pajas',
      'donwea@gmail.com': 'Donwea',
      'hehe@gmail.com': 'DonHeHe',
      'usuario_de_prueba@gmail.com': 'juan perez',
      'usuario1@gmail.com': 'antonio',
      'fr.levipil@duocuc.cl': 'Francisco L.',
      'franciscolevipil19@gmail.com': 'Francisco V.'
    };
    return usuarios[email as keyof typeof usuarios] || email?.split('@')[0] || 'Usuario';
  };

  const nuevoMensaje = { 
    user: obtenerNombreReal(user?.email), /// Asigna el nombre según el logueo
    text: input, 
    isMe: true 
  };

  setHistorialMensajes(prev => ({
    ...prev,
    [chatSeleccionado.id]: [...(prev[chatSeleccionado.id] || []), nuevoMensaje]
  }));

  setInput('');
};

  useEffect(() => {
    if (chatSeleccionado) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [chatSeleccionado]);

  return (
    <Layout headerTitle="Chat eMeet" showHeader={true}>
      <div className="flex h-[calc(100vh-8rem)] gap-4 p-2 lg:p-4 font-sans">
        
        {/* LISTA DE CHATS */}
        <aside className="w-full max-w-[320px] flex flex-col bg-violet-950/10 backdrop-blur-md rounded-[24px] border border-violet-500/10 overflow-hidden shrink-0 shadow-xl">
          <div className="flex px-5 pt-4 gap-6 border-b border-violet-500/10 bg-black/20">
            <button onClick={() => setTab('comunidad')} className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'comunidad' ? 'border-b-2 border-primary-light text-white' : 'text-muted'}`}>Comunidad</button>
            <button onClick={() => setTab('eventos')} className={`pb-3 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'eventos' ? 'border-b-2 border-primary-light text-white' : 'text-muted'}`}>Mis Eventos</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {(tab === 'comunidad' ? CHATS_COMUNIDAD : MIS_EVENTOS_MOCK).map(item => (
              <button 
                key={item.id} 
                onClick={() => setChatSeleccionado(item)}
                className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${chatSeleccionado?.id === item.id ? 'bg-violet-500/20 border border-violet-500/30' : 'hover:bg-violet-500/10 border border-transparent'}`}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-violet-500/20 shrink-0 shadow-lg">
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-xs font-bold text-white/90 truncate">{item.name}</h4>
                  <p className="text-[10px] text-muted truncate italic">
                    {historialMensajes[item.id]?.slice(-1)[0]?.text || "Sin mensajes"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ÁREA DE MENSAJES */}
        <main className="flex-1 flex flex-col bg-violet-950/10 backdrop-blur-md rounded-[24px] border border-violet-500/10 overflow-hidden relative shadow-2xl">
          {chatSeleccionado ? (
            <div className="flex flex-col h-full">
              <header className="p-4 border-b border-violet-500/10 bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-light/10 rounded-lg flex items-center justify-center border border-primary-light/20 text-primary-light text-xs font-bold shadow-inner">#</div>
                  <div>
                    <h2 className="text-xs font-bold text-white tracking-tight">{chatSeleccionado.name}</h2>
                    {isTyping && (
                      <p className="text-[9px] text-primary-light animate-pulse">{chatSeleccionado.participants[0]} está escribiendo...</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowDetails(!showDetails)} className="text-muted hover:text-white transition-colors"><HiInformationCircle className="text-xl" /></button>
              </header>
              
              <div className="flex-1 p-6 flex flex-col space-y-4 overflow-y-auto bg-black/5">
                {historialMensajes[chatSeleccionado.id]?.map((m, idx) => (
                  <div key={idx} className={`max-w-[75%] p-3 rounded-2xl text-xs shadow-md ${m.isMe ? 'self-end bg-primary/40 border border-primary/30 text-white rounded-br-none' : 'self-start bg-violet-500/10 border border-violet-500/20 text-white/90 rounded-bl-none'}`}>
                    {!m.isMe && <p className="text-[10px] text-primary-light font-bold mb-1">{m.user}</p>}
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>

              <footer className="p-4 bg-black/20">
                <form onSubmit={(e) => { e.preventDefault(); enviarMensaje(); }} className="flex gap-3 items-center bg-violet-950/30 p-3 rounded-xl border border-violet-500/10">
                  <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent outline-none text-xs text-white" placeholder="Escribe un mensaje..." />
                  <button type="submit" className="text-primary-light hover:scale-110 transition-transform"><HiPaperAirplane className="text-lg rotate-45" /></button>
                </form>
              </footer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center"><HiChatBubbleLeftRight className="text-4xl text-primary-light/20 mb-4" /><h2 className="text-sm font-bold text-white tracking-widest uppercase">eMeet Messenger</h2></div>
          )}
        </main>

        {/* DETALLES (Corregido con tipos para evitar errores de TypeScript) */}
        <AnimatePresence>
          {showDetails && chatSeleccionado && (
            <motion.aside initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="w-72 flex flex-col bg-violet-950/20 backdrop-blur-xl rounded-[24px] border border-violet-500/20 overflow-hidden shadow-2xl">
              <header className="p-5 border-b border-violet-500/10 flex items-center justify-between bg-black/40">
                <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Info del Evento</h3>
                <button onClick={() => setShowDetails(false)} className="text-muted hover:text-white"><HiXMark className="text-lg"/></button>
              </header>
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-primary-light/30 shadow-xl mb-4"><img src={chatSeleccionado.image} className="w-full h-full object-cover" /></div>
                <h2 className="text-sm font-bold text-white mb-1">{chatSeleccionado.name}</h2>
                <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-[9px] text-primary-light font-bold">{chatSeleccionado.category}</span>
              </div>
              <div className="p-6 space-y-6">
                <section><h4 className="text-[9px] font-bold text-muted uppercase mb-2">Descripción</h4><p className="text-[11px] text-white/70 italic">"{chatSeleccionado.description}"</p></section>
                <section>
                  <h4 className="text-[9px] font-bold text-muted uppercase mb-3">Participantes ({chatSeleccionado.participants.length})</h4>
                  <div className="space-y-2">
                    {/* Se define explícitamente el tipo de 'p' como string para solucionar el error ts(7006) */}
                    {chatSeleccionado.participants.map((p: string) => (
                      <div key={p} className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center text-[9px] text-white">{p.charAt(0)}</div>
                        <span className="text-[10px] text-white/80">{p}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}