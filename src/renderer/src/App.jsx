import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Plus, Maximize2, Minimize2, Trash2, Edit3, Check, Settings, Info, X, Power, Layers } from 'lucide-react';

export default function App() {
  const [memos, setMemos] = useState(() => {
    const savedMemos = localStorage.getItem('maorm-memos');
    if (savedMemos) {
      try { return JSON.parse(savedMemos); } catch (e) { console.error(e); }
    }
    return [
      { id: 1, title: '欢迎使用桌面备忘录', content: '点击右上角锁头解锁后可编辑内容。\n再次点击锁头即可固定并保存数据。', image: null, date: Date.now() },
    ];
  });

  // 锁定状态（控制是否允许编辑和拖拽）
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('maorm-locked') === 'true');
  
  // 置顶状态（默认false，即只在桌面底层）
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => localStorage.getItem('maorm-top') === 'true');
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [toastMsg, setToastMsg] = useState(''); // 提示语状态

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });

  // 保存备忘录数据
  useEffect(() => {
    localStorage.setItem('maorm-memos', JSON.stringify(memos));
  }, [memos]);

  // 监听并应用层级置顶状态
  useEffect(() => {
    localStorage.setItem('maorm-top', isAlwaysOnTop);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('set-always-on-top', isAlwaysOnTop);
    } catch (e) { console.log('非 Electron 环境'); }
  }, [isAlwaysOnTop]);

  // 保存锁定状态记录
  useEffect(() => {
    localStorage.setItem('maorm-locked', isLocked);
  }, [isLocked]);

  // 窗口坐标记忆功能
  useEffect(() => {
    const savedX = localStorage.getItem('maorm-pos-x');
    const savedY = localStorage.getItem('maorm-pos-y');
    if (savedX !== null && savedY !== null) {
      window.moveTo(parseInt(savedX, 10), parseInt(savedY, 10));
    }

    const timer = setInterval(() => {
      if (window.screenX >= -10000 && window.screenY >= -10000) {
        localStorage.setItem('maorm-pos-x', window.screenX);
        localStorage.setItem('maorm-pos-y', window.screenY);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 点击标题文字专属的右键菜单
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止冒泡，避免触发其他事件
    if (showAbout) return; 
    const menuWidth = 150; 
    const menuHeight = 140;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({ x, y });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('contextmenu', closeContextMenu); // 点击其他地方右键也会关闭当前菜单
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('contextmenu', closeContextMenu);
    };
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

  // 切换锁定：解锁时弹出 Toast 提示
  const toggleLock = () => {
    setIsLocked(prev => {
      const nextState = !prev;
      if (!nextState) { // 从锁定变为了解锁
        setToastMsg('⚠️ 提示：必须锁定才能保存数据与固定位置');
        setTimeout(() => setToastMsg(''), 3500); // 3.5秒后消失
      }
      return nextState;
    });
  };

  // 退出软件
  const quitApp = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('quit-app');
    } catch (e) { console.log('非 Electron 环境'); }
  };

  return (
    <div 
      // 最外层去除了 onContextMenu，确保别的地方右键无反应，且采用直角设计 rounded-none
      className={`w-screen h-screen rounded-none border flex flex-col overflow-hidden transition-all duration-500 ease-in-out font-sans relative select-none
        ${isLocked ? 'bg-white/5 border-white/5 backdrop-blur-md' : 'bg-white/20 border-white/20 shadow-2xl ring-1 ring-white/30 backdrop-blur-xl'}
        dark:bg-black/20 dark:border-white/10 text-gray-800 dark:text-gray-100
      `}
      style={{ WebkitAppRegion: isLocked ? 'no-drag' : 'drag' }}
    >
      {/* 标题栏 */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/5 dark:bg-black/10 shrink-0">
        
        {/* 【改动】：只有精准点击这几个字才会弹出右键菜单 */}
        <span 
          onContextMenu={handleContextMenu}
          className="text-sm font-bold tracking-widest text-gray-800/80 dark:text-gray-200/80 cursor-context-menu hover:text-blue-500 transition-colors pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' }}
          title="右键点击显示菜单"
        >
          桌面备忘录
        </span>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={toggleLock}
            className={`p-1.5 rounded-none transition-all flex items-center justify-center cursor-pointer relative z-40 pointer-events-auto
              ${isLocked ? 'hover:bg-black/10 dark:hover:bg-white/10' : 'hover:bg-black/10 dark:hover:bg-white/10'}
            `}
            style={{ WebkitAppRegion: 'no-drag' }}
            title={isLocked ? "点击解锁" : "点击锁定"}
          >
            {isLocked ? (
              <Lock size={15} className="text-gray-600 dark:text-gray-300 transition-colors" />
            ) : (
              <Unlock size={15} className="text-blue-500 dark:text-blue-400" />
            )}
          </button>
          
          {!isLocked && (
            <button 
              onClick={handleAddMemo} 
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-none transition-colors cursor-pointer text-gray-700 dark:text-gray-200 relative z-40 pointer-events-auto"
              style={{ WebkitAppRegion: 'no-drag' }}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 动态 Toast 提示浮窗 */}
      {toastMsg && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full z-50 pointer-events-none backdrop-blur-sm shadow-lg whitespace-nowrap border border-white/20 transition-opacity animate-in fade-in duration-300">
          {toastMsg}
        </div>
      )}

      {/* 内容栏：锁定模式下失去响应 */}
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
              className={`group bg-white/20 dark:bg-black/20 rounded-none p-3 shadow-sm border border-white/20 dark:border-white/5 transition-all flex flex-col relative
                ${displayMemos.length === 1 ? 'flex-1' : displayMemos.length === 2 ? 'h-1/2 flex-1' : 'min-h-[100px] shrink-0'}
              `}
            >
              {editingId === memo.id ? (
                <div className="flex flex-col h-full gap-2">
                  <input 
                    className="bg-white/40 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-none px-2 py-1 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-400 dark:text-white"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    autoFocus
                  />
                  <textarea 
                    className="bg-white/40 dark:bg-black/40 border border-white/30 dark:border-white/10 rounded-none px-2 py-1 text-xs flex-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 custom-scrollbar dark:text-gray-200"
                    value={editForm.content}
                    onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  />
                  <div className="flex justify-end mt-1">
                    <button onClick={() => saveEdit(memo.id)} className="p-1 bg-blue-500/80 backdrop-blur text-white rounded-none hover:bg-blue-600 transition-colors shadow-sm cursor-pointer pointer-events-auto">
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold line-clamp-1">{memo.title}</h3>
                    {!isLocked && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-black/50 rounded-none p-0.5 backdrop-blur-md">
                        <button onClick={() => startEditing(memo)} className="p-1 text-gray-600 hover:text-blue-500 dark:text-gray-300 cursor-pointer pointer-events-auto">
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => handleDelete(memo.id)} className="p-1 text-gray-600 hover:text-red-500 dark:text-gray-300 cursor-pointer pointer-events-auto">
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
                      <div className="w-16 h-16 rounded-none overflow-hidden shrink-0 border border-white/20 shadow-sm opacity-90">
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
            className="w-full py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-blue-600/80 dark:text-blue-400/80 bg-white/20 hover:bg-white/40 dark:bg-black/20 dark:hover:bg-black/40 rounded-none transition-colors border border-white/10 cursor-pointer pointer-events-auto"
          >
            <Maximize2 size={13} />
            <span>展开更多 ({memos.length - 3})</span>
          </button>
        )}
        {isExpanded && memos.length > 3 && (
          <button 
            onClick={() => setIsExpanded(false)}
            className="w-full py-1.5 flex items-center justify-center gap-1 text-xs font-medium text-gray-600/80 dark:text-gray-400/80 bg-white/20 hover:bg-white/40 dark:bg-black/20 dark:hover:bg-black/40 rounded-none transition-colors border border-white/10 cursor-pointer pointer-events-auto"
          >
            <Minimize2 size={13} />
            <span>收起</span>
          </button>
        )}
      </div>

      {/* 全新的强大右键菜单 */}
      {contextMenu && (
        <div 
          // 为了确保不会被拖拽事件干扰，加入 pointer-events-auto
          style={{ top: contextMenu.y, left: contextMenu.x, WebkitAppRegion: 'no-drag' }}
          className="absolute z-50 w-36 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/30 dark:border-gray-600 shadow-xl rounded-none p-1.5 text-sm pointer-events-auto"
        >
          {/* 层级切换开关 */}
          <button 
            onClick={() => setIsAlwaysOnTop(!isAlwaysOnTop)}
            className="w-full text-left px-2 py-1.5 flex items-center justify-between hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-none transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers size={13} />
              <span>全局置顶</span>
            </div>
            {/* 状态小点指示器 */}
            <div className={`w-2 h-2 rounded-full border border-gray-400 ${isAlwaysOnTop ? 'bg-green-500 border-none' : 'bg-transparent'}`} />
          </button>
          
          <div className="h-px bg-gray-300/50 dark:bg-gray-600/50 my-1 mx-1" />

          <button 
            onClick={() => {
              try {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('toggle-auto-start', true);
                alert('已尝试添加开机自启');
              } catch (e) { console.log('IPC error'); }
            }}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-none transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <Settings size={13} />
            开机自启动
          </button>
          
          <button 
            onClick={() => setShowAbout(true)}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-none transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <Info size={13} />
            关于本软件
          </button>

          <div className="h-px bg-gray-300/50 dark:bg-gray-600/50 my-1 mx-1" />

          <button 
            onClick={quitApp}
            className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 rounded-none transition-colors text-red-600 dark:text-red-400 cursor-pointer"
          >
            <Power size={13} />
            退出备忘录
          </button>
        </div>
      )}

      {/* 关于弹窗 */}
      {showAbout && (
        <div 
          className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-600 shadow-2xl rounded-none w-full p-5 flex flex-col items-center relative">
            <button 
              onClick={() => setShowAbout(false)}
              className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-black/5 rounded-none transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="w-12 h-12 bg-blue-500/90 rounded-none flex items-center justify-center text-white mb-3 shadow-md backdrop-blur">
              <Edit3 size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">桌面备忘录</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Version 1.0.3</p>
            <div className="w-full bg-black/5 dark:bg-black/20 rounded-none p-3 text-center border border-white/10">
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.4); border-radius: 0px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.8); }
        input, textarea, .select-text { -webkit-user-select: text; user-select: text; }
      `}} />
    </div>
  );
}