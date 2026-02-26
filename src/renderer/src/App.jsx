import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Plus, Maximize2, Minimize2, Trash2, Edit3, Check, Settings, Info, X } from 'lucide-react';

export default function App() {
  const [memos, setMemos] = useState(() => {
    const savedMemos = localStorage.getItem('maorm-memos');
    if (savedMemos) {
      try { return JSON.parse(savedMemos); } catch (e) { console.error(e); }
    }
    return [
      { id: 1, title: '欢迎使用备忘录小组件', content: '点击右上角锁头解锁后可编辑内容。\n再次点击锁头即可固定在桌面。', image: null, date: Date.now() },
    ];
  });

  // 让锁定状态也从本地硬盘读取，默认未锁定
  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('maorm-locked') === 'true';
  });
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [contextMenu, setContextMenu] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  useEffect(() => {
    localStorage.setItem('maorm-memos', JSON.stringify(memos));
  }, [memos]);

  // 监听锁定状态。只要状态改变或刚开机，立马存入硬盘并通知主进程
  useEffect(() => {
    localStorage.setItem('maorm-locked', isLocked);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('set-ignore-mouse', isLocked);
    } catch (e) {
      console.log('非 Electron 环境');
    }
  }, [isLocked]);

  // 窗口位置的自动保存与恢复
  useEffect(() => {
    // 刚开机时，读取上次保存的屏幕坐标，并把窗口“瞬移”过去
    const savedX = localStorage.getItem('maorm-pos-x');
    const savedY = localStorage.getItem('maorm-pos-y');
    if (savedX !== null && savedY !== null) {
      window.moveTo(parseInt(savedX, 10), parseInt(savedY, 10));
    }

    // 开启一个低频定时器(每1秒执行一次)，自动记录你拖拽后的最新位置
    const timer = setInterval(() => {
      // 防止窗口最小化等异常情况存入无效坐标
      if (window.screenX >= -10000 && window.screenY >= -10000) {
        localStorage.setItem('maorm-pos-x', window.screenX);
        localStorage.setItem('maorm-pos-y', window.screenY);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 处理右键菜单 (仅保留系统设置，取消锁定开关)
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (showAbout) return; 
    
    const menuWidth = 140; 
    const menuHeight = 100;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    
    setContextMenu({ x, y });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  const sortedMemos = [...memos].sort((a, b) => b.date - a.date);
  const displayMemos = isExpanded ? sortedMemos : sortedMemos.slice(0, 3);
  const showExpandButton = memos.length > 3 && !isExpanded;

  const handleAddMemo = () => {
    if (isLocked) return;
    const newMemo = { id: Date.now(), title: '新备忘录', content: '点击编辑内容...', image: null, date: Date.now() };
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

  // 点击标题栏锁头触发切换模式
  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  return (
    <div 
      // 这里的背景透明度大幅度调低 (bg-white/5) 配合 backdrop-blur 实现超透玻璃
      className={`w-screen h-screen rounded-2xl border flex flex-col overflow-hidden transition-all duration-500 ease-in-out font-sans relative select-none
        ${isLocked ? 'bg-white/5 border-white/5 backdrop-blur-md' : 'bg-white/20 border-white/20 shadow-2xl ring-1 ring-white/30 backdrop-blur-xl'}
        dark:bg-black/20 dark:border-white/10 text-gray-800 dark:text-gray-100
      `}
      style={{ WebkitAppRegion: isLocked ? 'no-drag' : 'drag' }}
      onContextMenu={handleContextMenu}
    >
      {/* 标题栏 */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/5 dark:bg-black/10 shrink-0">
        <span className="text-sm font-bold tracking-widest text-gray-800/80 dark:text-gray-200/80">备忘录</span>
        
        <div className="flex items-center gap-1">
          {/* 锁头按钮：唯一能在锁定模式下交互的元素 */}
          <button 
            onClick={toggleLock}
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${isLocked ? 'hover:bg-black/5 dark:hover:bg-white/5' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
            style={{ WebkitAppRegion: 'no-drag' }}
            title={isLocked ? "点击解锁" : "点击锁定"}
          >
            {isLocked ? (
              <Lock size={15} className="text-gray-400/80 dark:text-gray-500/80 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
            ) : (
              <Unlock size={15} className="text-blue-500 dark:text-blue-400" />
            )}
          </button>
          
          {!isLocked && (
            <button 
              onClick={handleAddMemo} 
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-gray-700 dark:text-gray-200"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 内容栏：锁定模式下加入 pointer-events-none，左键完全失去响应 */}
      <div 
        className={`flex-1 p-3 flex flex-col gap-3 overflow-y-auto overflow-x-hidden custom-scrollbar transition-opacity duration-300
          ${isLocked ? 'pointer-events-none opacity-80' : ''}
        `}
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
              // 卡片透明度也同步调低，配合底板实现高透
              className={`group bg-white/20 dark:bg-black/20 rounded-xl p-3 shadow-sm border border-white/20 dark:border-white/5 transition-all flex flex-col relative
                ${displayMemos.length === 1 ? 'flex-1' : displayMemos.length === 2 ? 'h-1/2 flex-1' : 'min-h-[100px] shrink-0'}
              `}
            >
              {editingId === memo.id ? (
                <div className="flex flex-col h-full gap-2">
                  <input 
                    className="bg-white/40 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded px-2 py-1 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 dark:text-white"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    autoFocus
                  />
                  <textarea 
                    className="bg-white/40 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded px-2 py-1 text-xs flex-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 custom-scrollbar dark:text-gray-200"
                    value={editForm.content}
                    onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  />
                  <div className="flex justify-end mt-1">
                    <button onClick={() => saveEdit(memo.id)} className="p-1 bg-blue-500/80 backdrop-blur text-white rounded hover:bg-blue-600 transition-colors shadow-sm">
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold line-clamp-1">{memo.title}</h3>
                    {!isLocked && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-black/50 rounded-md p-0.5 backdrop-blur-md">
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
                    <p className="text-xs text-gray-700/90 dark:text-gray-300/90 flex-1 leading-relaxed overflow-y-auto custom-scrollbar break-words whitespace-pre-wrap select-text">
                      {memo.content}
                    </p>
                    {memo.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/20 shadow-sm opacity-90">
                        <img src={memo.image} alt="memo img" className="w-full h-full object-cover" draggable={false} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}

        {showExpandButton && (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-blue-600/80 dark:text-blue-400/80 bg-white/20 hover:bg-white/40 dark:bg-black/20 dark:hover:bg-black/40 rounded-lg transition-colors border border-white/10"
          >
            <Maximize2 size={13} />
            <span>展开更多 ({memos.length - 3})</span>
          </button>
        )}
        {isExpanded && memos.length > 3 && (
          <button 
            onClick={() => setIsExpanded(false)}
            className="w-full py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-gray-600/80 dark:text-gray-400/80 bg-white/20 hover:bg-white/40 dark:bg-black/20 dark:hover:bg-black/40 rounded-lg transition-colors border border-white/10"
          >
            <Minimize2 size={13} />
            <span>收起</span>
          </button>
        )}
      </div>

      {/* 右键菜单：去除了锁定开关，精简为纯工具栏 */}
      {contextMenu && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x, WebkitAppRegion: 'no-drag' }}
          className="absolute z-40 w-32 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/30 dark:border-gray-600 shadow-xl rounded-xl p-1.5 text-sm"
        >
          <button 
            onClick={() => {
              try {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('toggle-auto-start', true);
                alert('已设置开机自启');
              } catch (e) { console.log('IPC error'); }
            }}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200"
          >
            <Settings size={13} />
            开机启动
          </button>
          <button 
            onClick={() => setShowAbout(true)}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-lg transition-colors text-gray-700 dark:text-gray-200 mt-1"
          >
            <Info size={13} />
            关于
          </button>
        </div>
      )}

      {/* 关于弹窗 */}
      {showAbout && (
        <div 
          className="absolute inset-0 z-50 bg-black/10 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/30 dark:border-gray-600 shadow-2xl rounded-2xl w-full p-5 flex flex-col items-center relative">
            <button 
              onClick={() => setShowAbout(false)}
              className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-black/5 rounded-full transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="w-12 h-12 bg-blue-500/90 rounded-full flex items-center justify-center text-white mb-3 shadow-md backdrop-blur">
              <Edit3 size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">备忘录小组件</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Version 1.0.1</p>
            <div className="w-full bg-black/5 dark:bg-black/20 rounded-lg p-3 text-center border border-white/10">
              <p className="text-sm text-gray-700 dark:text-gray-300">Designed & Developed by</p>
              <p className="text-base font-semibold text-blue-600 dark:text-blue-400 mt-0.5">MaoRM</p>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        :root { background: transparent !important; }
        body { margin: 0; background: transparent !important; overflow: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.6); }
        input, textarea, .select-text { -webkit-user-select: text; user-select: text; }
      `}} />
    </div>
  );
}