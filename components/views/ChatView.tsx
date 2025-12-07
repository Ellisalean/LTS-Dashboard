
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types.ts';
import { supabase } from '../../application/supabase.ts';
import { SendIcon, UserCircleIcon, ChatIcon, ChevronLeftIcon } from '../Icons.tsx';

interface ChatViewProps {
    user: User;
}

interface ChatUser {
    id: string;
    nombre: string;
    avatar_url: string;
    rol: string;
    unreadCount: number;
}

interface ChatMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    contenido: string;
    created_at: string;
    leido: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ user }) => {
    const [contacts, setContacts] = useState<ChatUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Obtener ID del usuario actual
    useEffect(() => {
        const fetchMe = async () => {
            const { data } = await supabase.from('estudiantes').select('id, rol').eq('nombre', user.name).single();
            if (data) {
                setCurrentUserId(data.id);
                fetchContacts(data.rol, data.id);
            }
        };
        fetchMe();
    }, [user]);

    // 2. Obtener lista de contactos y mensajes no leídos por usuario
    const fetchContacts = async (myRole: string, myId: string) => {
        let query = supabase.from('estudiantes').select('id, nombre, avatar_url, rol').neq('id', myId);
        
        // Si soy estudiante, solo veo admins. Si soy admin, veo a todos.
        if (myRole === 'estudiante') {
            query = query.eq('rol', 'admin');
        }

        const { data: users } = await query;
        
        if (users) {
            // Buscar mensajes NO leídos dirigidos a mí
            const { data: unreadMsgs } = await supabase
                .from('chat_mensajes')
                .select('sender_id')
                .eq('receiver_id', myId)
                .eq('leido', false);

            // Agrupar conteo por remitente
            const counts: {[key: string]: number} = {};
            unreadMsgs?.forEach((msg: any) => {
                counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
            });

            // Mapear usuarios con su conteo
            const mappedUsers = users.map((u: any) => ({
                id: u.id,
                nombre: u.nombre,
                avatar_url: u.avatar_url,
                rol: u.rol,
                unreadCount: counts[u.id] || 0
            }));

            // Ordenar: Primero los que tienen mensajes no leídos
            mappedUsers.sort((a, b) => b.unreadCount - a.unreadCount);

            setContacts(mappedUsers);
        }
    };

    // 3. Cargar Mensajes al seleccionar usuario
    useEffect(() => {
        if (!selectedUser || !currentUserId) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('chat_mensajes')
                .select('*')
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUserId})`)
                .order('created_at', { ascending: true });
            
            if (data) setMessages(data);
            
            // Marcar como leídos
            await markAsRead(selectedUser.id);
        };

        fetchMessages();

        // Suscripción Realtime
        const channel = supabase.channel('chat-room')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes' }, async (payload) => {
                const msg = payload.new as ChatMessage;
                
                // CASO A: Mensaje de la conversación actual abierta
                if (
                    (msg.sender_id === currentUserId && msg.receiver_id === selectedUser.id) ||
                    (msg.sender_id === selectedUser.id && msg.receiver_id === currentUserId)
                ) {
                    setMessages(prev => [...prev, msg]);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

                    // Si yo soy el receptor, marcar como leído al instante
                    if (msg.receiver_id === currentUserId) {
                         await markAsRead(msg.sender_id);
                    }
                }

                // CASO B: Mensaje de OTRA persona (Actualizar contadores en la lista lateral)
                if (msg.receiver_id === currentUserId) {
                    setContacts(prevContacts => prevContacts.map(c => {
                        // Si es el remitente Y NO es el chat que tengo abierto ahora mismo
                        if (c.id === msg.sender_id && c.id !== selectedUser.id) {
                            return { ...c, unreadCount: c.unreadCount + 1 };
                        }
                        return c;
                    }).sort((a, b) => b.unreadCount - a.unreadCount)); // Reordenar para que suba el contacto
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };

    }, [selectedUser, currentUserId]);

    const markAsRead = async (senderId: string) => {
        if (!currentUserId) return;
        
        await supabase.from('chat_mensajes')
            .update({ leido: true })
            .eq('receiver_id', currentUserId)
            .eq('sender_id', senderId)
            .eq('leido', false);
            
        // Limpiar contador visualmente
        setContacts(prev => prev.map(c => c.id === senderId ? { ...c, unreadCount: 0 } : c));
    };

    // Scroll al fondo al cargar mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedUser || !currentUserId) return;

        const { error } = await supabase.from('chat_mensajes').insert({
            sender_id: currentUserId,
            receiver_id: selectedUser.id,
            contenido: newMessage,
            leido: false
        });

        if (!error) {
            setNewMessage('');
        }
    };

    const handleSelectContact = (contact: ChatUser) => {
        setSelectedUser(contact);
        // Al hacer click, reseteamos su contador visualmente (la DB se actualiza en useEffect)
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unreadCount: 0 } : c));
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border dark:border-gray-700 relative">
            
            {/* LEFT SIDEBAR (CONTACTS) */}
            {/* Lógica Mobile: Si hay usuario seleccionado, oculta la lista en pantallas pequeñas (hidden md:flex) */}
            {/* Si NO hay usuario, la muestra ocupando todo el ancho (w-full) */}
            <div className={`
                ${selectedUser ? 'hidden md:flex' : 'flex'} 
                w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex-col
            `}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                        <ChatIcon className="w-5 h-5 mr-2 text-blue-500"/>
                        Mensajes
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.map(contact => (
                        <div 
                            key={contact.id}
                            onClick={() => handleSelectContact(contact)}
                            className={`flex items-center p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${selectedUser?.id === contact.id ? 'bg-blue-100 dark:bg-gray-700 border-l-4 border-blue-500' : ''}`}
                        >
                            <div className="relative">
                                <img src={contact.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                                {contact.unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 shadow-sm animate-bounce">
                                        {contact.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="ml-3 flex-1 overflow-hidden">
                                <div className="flex justify-between items-center">
                                    <p className={`text-sm truncate ${contact.unreadCount > 0 ? 'font-bold text-black dark:text-white' : 'font-semibold text-gray-800 dark:text-gray-200'}`}>
                                        {contact.nombre}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{contact.rol}</p>
                            </div>
                        </div>
                    ))}
                    {contacts.length === 0 && <p className="p-4 text-sm text-gray-500 text-center">No hay contactos disponibles.</p>}
                </div>
            </div>

            {/* RIGHT MAIN (CHAT AREA) */}
            {/* Lógica Mobile: Si hay usuario seleccionado, muestra el chat (flex). Si no, lo oculta en móvil (hidden md:flex) */}
            <div className={`
                ${selectedUser ? 'flex' : 'hidden md:flex'} 
                flex-1 flex-col bg-gray-50 dark:bg-gray-900 w-full
            `}>
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white dark:bg-gray-800 shadow-sm flex items-center border-b dark:border-gray-700">
                            {/* Botón Atrás (Solo visible en Móvil) */}
                            <button 
                                onClick={() => setSelectedUser(null)}
                                className="mr-3 md:hidden p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>

                            <img src={selectedUser.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                            <div className="ml-3">
                                <h3 className="font-bold text-gray-800 dark:text-white">{selectedUser.nombre}</h3>
                                <div className="flex items-center text-xs text-green-500">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> En línea
                                </div>
                            </div>
                        </div>

                        {/* Messages Feed */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.sender_id === currentUserId;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                            <p>{msg.contenido}</p>
                                            <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {isMe && <span className="ml-1">{msg.leido ? '✓✓' : '✓'}</span>}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex items-center space-x-2">
                            <input 
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim()}
                                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"
                            >
                                <SendIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <UserCircleIcon className="w-20 h-20 mb-4 opacity-20"/>
                        <p className="text-lg px-4 text-center">Selecciona un contacto para iniciar la conversación</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatView;
