import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Plus, Maximize2, Minimize2, Trash2, Edit3, Check, Settings, Info, X } from 'lucide-react';

export default function App() {
  // 核心状态：初始化时优先从本地硬盘(localStorage)读取数据
  const [memos, setMemos] = useState(() => {
    const savedMemos = localStorage.getItem('maorm-memos');
    if (savedMemos) {
      try {
        return JSON.parse(savedMemos);
      } catch (e) {
        console.error('读取本地备忘录失败', e);
      }
    }
    // 如果没有本地数据，显示默认的引导内容
    return [
      { id: 1, title: '欢迎使用 备忘录小组件！', content: '右键点击组件，选择“解锁”后即可随意拖动位置或编辑内容。\n\n写完后再次右键“锁定”即可固定在桌面。', image: null, date: Date.now() },
    ];
  });

  const [isLocked, setIsLocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 菜单与弹窗状态
  const [contextMenu, setContextMenu] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  // 编辑状态
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  // 核心存储逻辑：只要 memos 发生改变，就立即保存到本地硬盘
  useEffect(() => {
    localStorage.setItem('maorm-memos', JSON.stringify(memos));
  }, [memos]);

  // 处理右键菜单 (自动防止菜单超出窗口边界)
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (showAbout) return; 
    
    const menuWidth = 160; 
    const menuHeight = 130;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    
    setContextMenu({ x, y });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  // 备忘录逻辑
  const sortedMemos = [...memos].sort((a, b) => b.date - a.date);
  const displayMemos = isExpanded ? sortedMemos : sortedMemos.slice(0, 3);
  const showExpandButton = memos.length > 3 && !isExpanded;

  const handleAddMemo = () => {
    if (isLocked) return;
    const newMemo = {
      id: Date.now(),
      title: '新备忘录',
      content: '点击编辑内容...',
      image: null,
      date: Date.now()
    };
    setMemos([newMemo, ...memos]);
    startEditing(newMemo);
  };

  const handleDelete = (id) => {
    if (isLocked) return;
    setMemos(memos.filter(m => m.id !== id));
  };

  const startEditing = (memo) => {
    if (isLocked) return;
    setEditingId(memo.id);
    setEditForm({ title: memo.title, content: memo.content });
  };

  const saveEdit = (id) => {
    setMemos(memos.map(m => m.id === id ? { ...m, ...editForm } : m));
    setEditingId(null);
  };

  // 切换锁定状态
  const toggleLock = () => {
    const newState = !isLocked;
    setIsLocked(newState);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('set-ignore-mouse', newState);
    } catch (e) {
      console.log('非 Electron 环境，跳过系统 API 调用');
    }
  };

  return (
    <div 
      className={`w-screen h-screen rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ease-in-out font-sans relative select-none
        ${isLocked ? 'bg-white/10 border-white/10' : 'bg-white/30 border-white/20 shadow-2xl ring-1 ring-white/40'}
        dark:bg-black/40 dark:border-white/10 text-gray-800 dark:text-gray-100
      `}
      style={{ WebkitAppRegion: isLocked ? 'no-drag' : 'drag' }}
      onContextMenu={handleContextMenu}
    >
      {/* 标题栏 */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/10 dark:bg-black/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-widest">备忘录</span>
          {isLocked ? (
            <Lock size={13} className="text-gray-500 dark:text-gray-400" />
          ) : (
            <Unlock size={13} className="text-blue-500 dark:text-blue-400" />
          )}
        </div>
        {!isLocked && (
          <button 
            onClick={handleAddMemo} 
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* 内容栏 */}
      <div 
        className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto overflow-x-hidden custom-scrollbar"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {displayMemos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
            暂无备忘录，请添加。
          </div>
        ) : (
          displayMemos.map((memo) => (
            <div 
              key={memo.id} 
              className={`group bg-white/50 dark:bg-black/40 rounded-xl p-3 shadow-sm border border-white/30 dark:border-white/10 transition-all flex flex-col relative
                ${displayMemos.length === 1 ? 'flex-1' : displayMemos.length === 2 ? 'h-1/2 flex-1' : 'min-h-[100px] shrink-0'}
              `}
            >
              {editingId === memo.id ? (
                <div className="flex flex-col h-full gap-2">
                  <input 
                    className="bg-white/60 dark:bg-black/60 border border-white/40 dark:border-white/20 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 dark:text-white"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    autoFocus
                  />
                  <textarea 
                    className="bg-white/60 dark:bg-black/60 border border-white/40 dark:border-white/20 rounded px-2 py-1 text-xs flex-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 custom-scrollbar dark:text-gray-200"
                    value={editForm.content}
                    onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  />
                  <div className="flex justify-end mt-1">
                    <button onClick={() => saveEdit(memo.id)} className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors shadow-sm">
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold line-clamp-1">{memo.title}</h3>
                    {!isLocked && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-black/80 rounded-md p-0.5 backdrop-blur-md">
                        <button onClick={() => startEditing(memo)} className="p-1 text-gray-600 hover:text-blue-500 dark:text-gray-300">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => handleDelete(memo.id)} className="p-1 text-gray-600 hover:text-red-500 dark:text-gray-300">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-1 overflow-hidden">
                    <p className="text-xs text-gray-700 dark:text-gray-300 flex-1 leading-relaxed overflow-y-auto custom-scrollbar break-words whitespace-pre-wrap select-text">
                      {memo.content}
                    </p>
                    {memo.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/30 shadow-sm">
                        <img src={memo.image} alt="memo img" className="w-full h-full object-cover" draggable={false} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}

        {/* 展开与收起按钮 */}
        {showExpandButton && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 flex items-center justify-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-white/40 hover:bg-white/60 dark:bg-black/30 dark:hover:bg-black/50 rounded-lg transition-colors border border-white/20"
          >
            <Maximize2 size={13} />
            <span>展开更多 ({memos.length - 3})</span>
          </button>
        )}
        {isExpanded && memos.length > 3 && (
          <button 
            onClick={() => setIsExpanded(false)}
            className="w-full py-2 flex items-center justify-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white/40 hover:bg-white/60 dark:bg-black/30 dark:hover:bg-black/50 rounded-lg transition-colors border border-white/20"
          >
            <Minimize2 size={13} />
            <span>收起</span>
          </button>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x, WebkitAppRegion: 'no-drag' }}
          className="absolute z-40 w-36 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/30 dark:border-gray-600 shadow-xl rounded-xl p-1.5 text-sm"
        >
          <button 
            onClick={toggleLock}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
            {isLocked ? '解锁部件' : '锁定桌面'}
          </button>
          
          <div className="h-px bg-gray-200/50 dark:bg-gray-700/50 my-1 mx-1" />
          
          <button 
            onClick={() => {
              try {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('toggle-auto-start', true);
                alert('已设置开机自启');
              } catch (e) {
                console.log('IPC 调用失败');
              }
            }}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Settings size={14} />
            开机启动
          </button>
          <button 
            onClick={() => setShowAbout(true)}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Info size={14} />
            关于
          </button>
        </div>
      )}

      {/* 关于弹窗 */}
      {showAbout && (
        <div 
          className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/30 dark:border-gray-600 shadow-2xl rounded-2xl w-full p-5 flex flex-col items-center relative transform transition-all">
            <button 
              onClick={() => setShowAbout(false)}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-black/5 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white mb-3 shadow-md">
              <Edit3 size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">MaoRM Memo</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Version 1.0.0</p>
            
            <div className="w-full bg-black/5 dark:bg-black/20 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Designed & Developed by
              </p>
              <p className="text-base font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                MaoRM
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的滚动条样式 */}
      <style dangerouslySetInnerHTML={{__html: `
        :root { background: transparent !important; }
        body { margin: 0; background: transparent !important; overflow: hidden; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.4); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.8); }
        
        input, textarea, .select-text {
          -webkit-user-select: text;
          user-select: text;
        }
      `}} />
    </div>
  );
}