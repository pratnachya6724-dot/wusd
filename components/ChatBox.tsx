'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Message, Profile } from '@/lib/types';

interface ChatBoxProps {
  orderId: string;
  userId: string;
}

export default function ChatBox({ orderId, userId }: ChatBoxProps) {
  const [messages, setMessages] = useState<(Message & { sender?: Profile })[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles(*)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as (Message & { sender?: Profile })[]);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `order_id=eq.${orderId}`,
      }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);

    const { error } = await supabase.from('messages').insert({
      order_id: orderId,
      sender_id: userId,
      content: text.trim(),
      message_type: 'text',
    });

    if (!error) setText('');
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์รูปภาพต้องไม่เกิน 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;
      const filePath = `chat_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      await supabase.from('messages').insert({
        order_id: orderId,
        sender_id: userId,
        content: publicUrl,
        message_type: 'image',
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('ไม่สามารถอัปโหลดรูปภาพได้: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="chatbox">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">ยังไม่มีข้อความ เริ่มสนทนาได้เลย</p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-bubble-wrapper ${msg.sender_id === userId ? 'mine' : 'theirs'} ${msg.message_type === 'system' ? 'system' : ''}`}
          >
            {msg.message_type === 'system' ? (
              <div className="chat-system">{msg.content}</div>
            ) : (
              <>
                {msg.sender_id !== userId && (
                  <p className="chat-sender-name">{msg.sender?.name || 'ผู้ใช้'}</p>
                )}
                <div className="chat-bubble">
                  {msg.message_type === 'image' ? (
                    <a href={msg.content} target="_blank" rel="noopener noreferrer">
                      <img src={msg.content} alt="รูปภาพ" className="chat-image" />
                    </a>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <span className="chat-time">
                    {new Date(msg.created_at).toLocaleTimeString('th-TH', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          onChange={handleImageUpload}
        />
        <button 
          type="button" 
          className="chat-image-input-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '⏳' : '📷'}
        </button>

        <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="chat-input"
            placeholder={uploading ? "กำลังอัปโหลดรูป..." : "พิมพ์ข้อความ..."}
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            disabled={uploading}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!text.trim() || sending || uploading}
          >
            ส่ง
          </button>
        </form>
      </div>
    </div>
  );
}
