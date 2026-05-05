"use client";
import { useState, useEffect } from 'react';
import { HiPaperAirplane, HiChatBubbleLeftRight } from 'react-icons/hi2';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

export default function ChatPage() {
  const [tab, setTab] = useState<'comunidad' | 'eventos'>('comunidad');
  const [input, setInput] = useState('');
  const [chatsCercanos, setChatsCercanos] = useState<any[]>([]); 
  const [misEventos, setMisEventos] = useState<any[]>([]);
  const [chatSeleccionado, setChatSeleccionado] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatosEmeet = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('user_events')
            .select('*')
            .eq('user_id', user.id);

          if (!error && data) {
            const formateados = data.map((item: any) => ({
              id: item.event_id,
              name: item.event_title || "Evento eMeet",
              msg: "¡Conéctate ahora!",
              image: item.event_image_url
            }));
            setMisEventos(formateados);
          }
        }
      } catch (err) {
        console.error("Error en Chat:", err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatosEmeet();
  }, []);

  if (loading) return null;

  return (
    <div className="fixed inset-0 pl-64 flex bg-transparent font-sans overflow-hidden">
      <div className="flex flex-1 h-full p-4 gap-4 overflow-hidden">
        
        {/* PANEL IZQUIERDO */}
        <aside className="w-72 flex flex-col bg-metal-card rounded-3xl border border-white/5 shadow-2xl overflow-hidden shrink-0">
          <div className="flex px-5 pt-6 gap-6 border-b border-white/5 bg-black/20">
            <button 
              onClick={() => setTab('comunidad')} 
              className={`pb-4 text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${tab === 'comunidad' ? 'border-b-2 border-primary text-white' : 'text-muted'}`}
            >
              Comunidad
            </button>
            <button 
              onClick={() => setTab('eventos')} 
              className={`pb-4 text-[9px] font-bold uppercase tracking-[0.2em] transition-all ${tab === 'eventos' ? 'border-b-2 border-primary text-white' : 'text-muted'}`}
            >
              Eventos
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {(tab === 'comunidad' ? chatsCercanos : misEventos).map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setChatSeleccionado(item)}
                    className="p-3 rounded-2xl flex items-center gap-3 hover:bg-primary/10 cursor-pointer border border-transparent hover:border-primary/20 group"
                  >
                    <div className="w-10 h-10 bg-surface rounded-xl overflow-hidden border border-white/10 shrink-0">
                      {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted">👤</div>}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-[11px] font-bold text-white/90 truncate">{item.name}</h4>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </aside>

        {/* PANEL DERECHO */}
        <main className="flex-1 flex flex-col bg-metal rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
          {chatSeleccionado ? (
            <div className="flex flex-col h-full bg-black/10">
              <header className="p-5 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/20 text-primary-light text-[10px]">#</div>
                <h2 className="text-xs font-bold text-white/90 truncate">{chatSeleccionado.name}</h2>
              </header>
              <div className="flex-1" />
              <footer className="p-5">
                <div className="flex gap-3 items-center bg-card px-5 py-3 rounded-2xl border border-white/5 shadow-inner">
                  <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 bg-transparent outline-none text-xs text-white" placeholder="Escribe..." />
                  <button className="text-primary active:scale-90"><HiPaperAirplane className="rotate-45" /></button>
                </div>
              </footer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-black/5">
              <div className="w-16 h-16 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-4 border border-primary/20">
                <HiChatBubbleLeftRight className="text-3xl text-primary/40" />
              </div>
              <h2 className="text-sm font-bold text-white/80 uppercase">eMeet Chat</h2>
              <p className="text-[10px] text-muted mt-2">Selecciona un evento para conectar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}