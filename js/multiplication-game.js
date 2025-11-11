// 乘法学习消消乐 - 游戏逻辑

class MultiplicationGame {
            constructor() {
                this.board = [];
                this.selectedBlocks = [];
                this.score = 0;
                this.combo = 0;
                this.correctAnswers = 0;
                this.totalAnswers = 0;
                this.currentQuestion = null;
                this.answerLocked = false;
                this.level = 1;
                this.targetScore = 500;
                this.levelScore = 0; // 当前关卡分数
                
                // 玩家系统
                this.playerName = '';
                this.gameStartTime = null;
                this.isGameActive = false;
                this.sessionId = null; // 会话 ID，用于区分不同局游戏
                
                // 根据关卡计算棋盘大小
                this.updateBoardSize();
                
                // 道具系统
                this.powerUps = {
                    bomb: 0,      // 炸弹：消除3x3区域
                    hint: 0,      // 提示：高亮可消除的方块
                    shuffle: 0    // 洗牌：重新随机排列
                };
                
                // 彩蛋配置
                this.eggTypes = [
                    { type: 'bomb', name: '💣 炸弹', desc: '消除3x3区域的所有方块', icon: '💣' },
                    { type: 'hint', name: '💡 提示', desc: '高亮显示可以消除的方块', icon: '💡' },
                    { type: 'shuffle', name: '🔄 洗牌', desc: '重新随机打乱所有方块', icon: '🔄' }
                ];
                
                // 触摸滑动选择相关
                this.isDrawing = false;
                this.lastTouchedBlock = null;
                this.selectionLines = [];
                
                // 初始化音效系统
                this.initAudio();
                
                // 数字对应的颜色和形状 - 优化为高饱和度、高对比度的鲜艳色彩
                this.blockStyles = {
                    1: { color: '#FF1744', shape: 'circle' },      // 鲜艳红色
                    2: { color: '#00E676', shape: 'square' },      // 鲜艳绿色
                    3: { color: '#2979FF', shape: 'diamond' },     // 鲜艳蓝色
                    4: { color: '#FF9100', shape: 'circle' },      // 鲜艳橙色
                    5: { color: '#E040FB', shape: 'square' },      // 鲜艳紫色
                    6: { color: '#FFEA00', shape: 'diamond' },     // 鲜艳黄色
                    7: { color: '#00E5FF', shape: 'circle' },      // 鲜艳青色
                    8: { color: '#FF4081', shape: 'square' },      // 鲜艳粉色
                    9: { color: '#76FF03', shape: 'diamond' }      // 鲜艳黄绿色
                };

                this.init();
                this.initFullscreen();
                this.initOrientationDetection();
                this.initRestartButton();
                this.initPowerUps();
                this.initRankButton();
                
                // 显示登录弹窗
                this.showLoginModal();
            }

            initFullscreen() {
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                if (!fullscreenBtn) return;

                fullscreenBtn.addEventListener('click', () => {
                    const elem = document.documentElement;
                    if (!document.fullscreenElement) {
                        if (elem.requestFullscreen) {
                            elem.requestFullscreen();
                        } else if (elem.webkitRequestFullscreen) {
                            elem.webkitRequestFullscreen();
                        } else if (elem.msRequestFullscreen) {
                            elem.msRequestFullscreen();
                        }
                        fullscreenBtn.textContent = '⛶';
                    } else {
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        }
                        fullscreenBtn.textContent = '⛶';
                    }
                });

                // 触摸事件支持
                fullscreenBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    fullscreenBtn.click();
                });
            }

            initOrientationDetection() {
                // 检测屏幕方向 - 只在小屏幕设备上提示
                const checkOrientation = () => {
                    const tip = document.getElementById('orientationTip');
                    if (!tip) return;
                    
                    const isPortrait = window.innerHeight > window.innerWidth;
                    const isSmallScreen = window.innerWidth < 768;
                    
                    if (isPortrait && isSmallScreen) {
                        tip.classList.add('show-portrait-tip');
                    } else {
                        tip.classList.remove('show-portrait-tip');
                    }
                };

                checkOrientation();
                window.addEventListener('orientationchange', checkOrientation);
                window.addEventListener('resize', checkOrientation);
            }

            initRestartButton() {
                const restartBtn = document.getElementById('restartBtn');
                if (!restartBtn) return;

                const handleRestart = () => {
                    // 保存当前成绩
                    if (this.isGameActive) {
                        this.saveGameRecord();
                    }
                    
                    // 生成新的会话 ID（开启新的一局游戏）
                    this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    
                    // 重新显示登录页
                    this.isGameActive = false;
                    this.showLoginModal();
                };

                restartBtn.addEventListener('click', handleRestart);
                
                // 触摸事件支持
                restartBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    handleRestart();
                });
            }

            updateBoardSize() {
                // 第1关: 5×5, 每关增加1行1列，最大10×10
                const size = Math.min(5 + (this.level - 1), 10);
                this.boardRows = size;
                this.boardCols = size;
                
                // 更新CSS网格布局
                const gameBoard = document.getElementById('gameBoard');
                if (gameBoard) {
                    gameBoard.style.gridTemplateColumns = `repeat(${this.boardCols}, 45px)`;
                }
            }

            init() {
                this.initBoard();
                this.renderBoard();
                this.updateScore();
            }

            initAudio() {
                // 延迟创建 AudioContext，等待用户交互
                this.audioContext = null;
                this.audioInitialized = false;
                this.initAudioOnFirstInteraction();
            }

            initAudioOnFirstInteraction() {
                const unlockAudio = async () => {
                    if (!this.audioInitialized) {
                        try {
                            // 在用户交互时创建 AudioContext
                            if (!this.audioContext) {
                                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                            }
                            
                            // 恢复 AudioContext（iOS Safari 需要）
                            if (this.audioContext.state === 'suspended') {
                                await this.audioContext.resume();
                            }
                            
                            // 播放一个静音音符来解锁音频（iOS 技巧）
                            const oscillator = this.audioContext.createOscillator();
                            const gainNode = this.audioContext.createGain();
                            gainNode.gain.value = 0.001; // 几乎静音
                            oscillator.connect(gainNode);
                            gainNode.connect(this.audioContext.destination);
                            oscillator.start(0);
                            oscillator.stop(0.001);
                            
                            this.audioInitialized = true;
                            console.log('音频已解锁');
                        } catch (error) {
                            console.error('音频解锁失败:', error);
                        }
                    }
                };
                
                // 监听多种用户交互事件来解锁音频
                document.addEventListener('touchstart', unlockAudio, { once: true });
                document.addEventListener('touchend', unlockAudio, { once: true });
                document.addEventListener('click', unlockAudio, { once: true });
                
                // 在游戏板上也监听事件（确保一定会触发）
                const gameBoard = document.getElementById('gameBoard');
                if (gameBoard) {
                    gameBoard.addEventListener('touchstart', unlockAudio, { once: true });
                }
            }

            // 播放正确答案音效
            playCorrectSound() {
                if (!this.audioContext || !this.audioInitialized) return;
                
                try {
                    const ctx = this.audioContext;
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    
                    // 上升的音调序列 (C-E-G)
                    const now = ctx.currentTime;
                    oscillator.frequency.setValueAtTime(523.25, now); // C5
                    oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
                    oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5
                    
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.6, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    
                    oscillator.start(now);
                    oscillator.stop(now + 0.4);
                } catch (error) {
                    console.error('播放音效失败:', error);
                }
            }

            // 播放错误答案音效
            playWrongSound() {
                if (!this.audioContext || !this.audioInitialized) return;
                
                try {
                    const ctx = this.audioContext;
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    
                    // 下降的音调 (低沉的错误提示音)
                    const now = ctx.currentTime;
                    oscillator.frequency.setValueAtTime(300, now);
                    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.3);
                    
                    oscillator.type = 'sawtooth';
                    
                    gainNode.gain.setValueAtTime(0.4, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    
                    oscillator.start(now);
                    oscillator.stop(now + 0.3);
                } catch (error) {
                    console.error('播放音效失败:', error);
                }
            }

            // 播放消除方块音效
            playEliminateSound() {
                if (!this.audioContext || !this.audioInitialized) return;
                
                try {
                    const ctx = this.audioContext;
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    
                    // 清脆的消除音效
                    const now = ctx.currentTime;
                    oscillator.frequency.setValueAtTime(1000, now);
                    oscillator.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
                    
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(0.3, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    
                    oscillator.start(now);
                    oscillator.stop(now + 0.15);
                } catch (error) {
                    console.error('播放音效失败:', error);
                }
            }

            // 播放选中色块音效
            playSelectSound() {
                if (!this.audioContext || !this.audioInitialized) return;
                
                try {
                    const ctx = this.audioContext;
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    
                    // 清脆的点击音效 - 短促明快
                    const now = ctx.currentTime;
                    oscillator.frequency.setValueAtTime(800, now);
                    oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
                    
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.25, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                    
                    oscillator.start(now);
                    oscillator.stop(now + 0.08);
                } catch (error) {
                    console.error('播放音效失败:', error);
                }
            }

            initBoard() {
                // 先用随机数填充整个棋盘
                this.board = [];
                for (let row = 0; row < this.boardRows; row++) {
                    this.board[row] = [];
                    for (let col = 0; col < this.boardCols; col++) {
                        this.board[row][col] = this.getRandomNumber();
                    }
                }
                
                // 创建聚类区域，让相同数字形成连续的群组
                this.createClusters();
            }

            getRandomNumber() {
                return Math.floor(Math.random() * 9) + 1;
            }

            createClusters() {
                // 根据关卡调整聚类数量和大小，关卡越高聚类越少越小
                let baseClusterCount = 20;
                let maxClusterSize = 9;
                
                // 第6关（10×10）之后，通过减少聚类数量和大小来增加难度
                if (this.level >= 6) {
                    // 每关减少2个聚类
                    baseClusterCount = Math.max(10, 20 - (this.level - 6) * 2);
                    // 每关减小最大聚类尺寸
                    maxClusterSize = Math.max(3, 9 - Math.floor((this.level - 6) / 2));
                }
                
                const clusterCount = baseClusterCount + Math.floor(Math.random() * 11);
                
                for (let i = 0; i < clusterCount; i++) {
                    // 随机选择一个起始位置
                    const startRow = Math.floor(Math.random() * this.boardRows);
                    const startCol = Math.floor(Math.random() * this.boardCols);
                    const clusterValue = this.getRandomNumber();
                    
                    // 随机决定聚类大小 (2-maxClusterSize个方块)
                    const clusterSize = 2 + Math.floor(Math.random() * (maxClusterSize - 1));
                    
                    // 从起始位置扩展聚类
                    this.expandCluster(startRow, startCol, clusterValue, clusterSize);
                }
            }

            // 从指定位置扩展聚类
            expandCluster(startRow, startCol, value, targetSize) {
                // 首先检查起始位置周围的连通区域大小
                const existingConnectedSize = this.getConnectedRegionSize(startRow, startCol, value);
                
                // 如果已经存在的连通区域 + 目标大小会超过9，则调整目标大小
                const adjustedTargetSize = Math.min(targetSize, 9 - existingConnectedSize);
                
                if (adjustedTargetSize <= 0) {
                    // 已经有足够大的区域，不再扩展
                    return;
                }
                
                const cluster = [{row: startRow, col: startCol}];
                this.board[startRow][startCol] = value;
                
                // 使用广度优先搜索扩展聚类
                while (cluster.length < adjustedTargetSize) {
                    // 从现有聚类中随机选择一个方块
                    const current = cluster[Math.floor(Math.random() * cluster.length)];
                    
                    // 获取相邻的可用位置（要检查不会导致超过9个连续）
                    const neighbors = this.getSafeNeighbors(current.row, current.col, cluster, value);
                    
                    if (neighbors.length === 0) {
                        // 没有可用的相邻位置，停止扩展
                        break;
                    }
                    
                    // 随机选择一个相邻位置
                    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                    this.board[next.row][next.col] = value;
                    cluster.push(next);
                }
            }

            // 获取安全的相邻位置（不会导致超过9个连续方块）
            getSafeNeighbors(row, col, existingCluster, value) {
                const neighbors = [];
                const directions = [
                    {dr: -1, dc: 0},  // 上
                    {dr: 1, dc: 0},   // 下
                    {dr: 0, dc: -1},  // 左
                    {dr: 0, dc: 1}    // 右
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.dr;
                    const newCol = col + dir.dc;
                    
                    // 检查是否在棋盘范围内
                    if (newRow >= 0 && newRow < this.boardRows && 
                        newCol >= 0 && newCol < this.boardCols) {
                        
                        // 检查是否已经在聚类中
                        const alreadyInCluster = existingCluster.some(
                            pos => pos.row === newRow && pos.col === newCol
                        );
                        
                        if (!alreadyInCluster) {
                            // 临时设置该位置为目标值，检查连通区域大小
                            const originalValue = this.board[newRow][newCol];
                            this.board[newRow][newCol] = value;
                            
                            const connectedSize = this.getConnectedRegionSize(newRow, newCol, value);
                            
                            // 恢复原值
                            this.board[newRow][newCol] = originalValue;
                            
                            // 只有当连通区域不超过9时才添加
                            if (connectedSize <= 9) {
                                neighbors.push({row: newRow, col: newCol});
                            }
                        }
                    }
                }
                
                return neighbors;
            }

            // 获取从指定位置开始的相同值的连通区域大小
            getConnectedRegionSize(startRow, startCol, value) {
                const visited = new Set();
                const queue = [{row: startRow, col: startCol}];
                visited.add(`${startRow},${startCol}`);
                
                let count = 0;
                
                while (queue.length > 0) {
                    const {row, col} = queue.shift();
                    
                    // 检查当前位置的值
                    if (this.board[row][col] === value) {
                        count++;
                        
                        // 检查四个方向
                        const directions = [
                            {dr: -1, dc: 0},
                            {dr: 1, dc: 0},
                            {dr: 0, dc: -1},
                            {dr: 0, dc: 1}
                        ];
                        
                        for (const dir of directions) {
                            const newRow = row + dir.dr;
                            const newCol = col + dir.dc;
                            const key = `${newRow},${newCol}`;
                            
                            if (newRow >= 0 && newRow < this.boardRows &&
                                newCol >= 0 && newCol < this.boardCols &&
                                !visited.has(key)) {
                                
                                visited.add(key);
                                queue.push({row: newRow, col: newCol});
                            }
                        }
                    }
                }
                
                return count;
            }

            renderBoard() {
                const gameBoard = document.getElementById('gameBoard');
                gameBoard.innerHTML = '';

                for (let row = 0; row < this.boardRows; row++) {
                    for (let col = 0; col < this.boardCols; col++) {
                        const value = this.board[row][col];
                        if (value !== null) {
                            const block = this.createBlock(value, row, col);
                            gameBoard.appendChild(block);
                        } else {
                            const emptyBlock = document.createElement('div');
                            gameBoard.appendChild(emptyBlock);
                        }
                    }
                }
            }

            createBlock(value, row, col) {
                const block = document.createElement('div');
                const style = this.blockStyles[value];
                
                block.className = `block shape-${style.shape}`;
                block.style.backgroundColor = style.color;
                block.dataset.row = row;
                block.dataset.col = col;
                block.dataset.value = value;

                const content = document.createElement('div');
                content.className = 'block-content';
                content.textContent = value;
                block.appendChild(content);

                // 鼠标点击事件（桌面端）
                block.addEventListener('click', () => this.handleBlockClick(row, col));
                
                // 触摸事件（移动端）- 支持划线选择
                block.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleTouchStart(row, col, e);
                });
                
                block.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    this.handleTouchMove(e);
                });
                
                block.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.handleTouchEnd();
                });
                
                block.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    this.handleTouchEnd();
                });

                return block;
            }

            handleBlockClick(row, col) {
                const value = this.board[row][col];
                if (value === null) return;

                // 如果已经答题锁定，不允许选择
                if (this.answerLocked) return;

                const blockKey = `${row},${col}`;

                // 检查是否点击已选中的方块
                const existingIndex = this.selectedBlocks.findIndex(b => b.key === blockKey);
                
                if (existingIndex !== -1) {
                    // 第二次点击同一方块，取消选择
                    this.clearSelection();
                    return;
                }

                // 如果是第一个选择的方块
                if (this.selectedBlocks.length === 0) {
                    this.selectedBlocks.push({ row, col, value, key: blockKey });
                    this.playSelectSound(); // 播放选中音效
                    this.updateBlockSelection();
                } else {
                    const firstBlock = this.selectedBlocks[0];
                    
                    // 检查是否为相同数字
                    if (value !== firstBlock.value) {
                        // 点击不同数字，清空重选
                        this.clearSelection();
                        this.selectedBlocks.push({ row, col, value, key: blockKey });
                        this.playSelectSound(); // 播放选中音效
                        this.updateBlockSelection();
                        return;
                    }

                    // 检查是否与任意一个已选中的方块相邻
                    const isAdjacentToAny = this.selectedBlocks.some(selectedBlock => 
                        this.isAdjacent(selectedBlock, { row, col })
                    );
                    
                    if (!isAdjacentToAny) {
                        // 不相邻，显示错误提示
                        this.showError(row, col);
                        return;
                    }

                    // 添加到选中列表
                    this.selectedBlocks.push({ row, col, value, key: blockKey });
                    this.playSelectSound(); // 播放选中音效
                    this.updateBlockSelection();
                }

                // 如果选中了2个或以上，更新题目
                if (this.selectedBlocks.length >= 2) {
                    this.updateQuestion();
                }
            }

            isAdjacent(block1, block2) {
                const rowDiff = Math.abs(block1.row - block2.row);
                const colDiff = Math.abs(block1.col - block2.col);
                return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
            }

            showError(row, col) {
                const blocks = document.querySelectorAll('.block');
                blocks.forEach(block => {
                    if (block.dataset.row == row && block.dataset.col == col) {
                        block.classList.add('shake');
                        setTimeout(() => block.classList.remove('shake'), 500);
                    }
                });
            }

            updateBlockSelection() {
                const blocks = document.querySelectorAll('.block');
                blocks.forEach(block => {
                    const key = `${block.dataset.row},${block.dataset.col}`;
                    if (this.selectedBlocks.some(b => b.key === key)) {
                        block.classList.add('selected');
                    } else {
                        block.classList.remove('selected');
                    }
                });
            }

            clearSelection() {
                this.selectedBlocks = [];
                this.currentQuestion = null;
                this.answerLocked = false;
                this.isDrawing = false;
                this.lastTouchedBlock = null;
                this.updateBlockSelection();
                this.clearQuestionArea();
                this.clearSelectionLines();
            }

            // 触摸开始 - 开始划线选择
            handleTouchStart(row, col, e) {
                const value = this.board[row][col];
                if (value === null || this.answerLocked) return;

                // 开始新的选择
                this.isDrawing = true;
                this.selectedBlocks = [];
                this.clearSelectionLines();
                
                const blockKey = `${row},${col}`;
                this.selectedBlocks.push({ row, col, value, key: blockKey });
                this.lastTouchedBlock = { row, col };
                this.playSelectSound();
                this.updateBlockSelection();
            }

            // 触摸移动 - 连续选择
            handleTouchMove(e) {
                if (!this.isDrawing || this.answerLocked) return;

                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                
                if (!element || !element.classList.contains('block')) return;

                const row = parseInt(element.dataset.row);
                const col = parseInt(element.dataset.col);
                const value = this.board[row][col];
                
                if (value === null) return;

                // 检查是否是同一个方块
                if (this.lastTouchedBlock && 
                    this.lastTouchedBlock.row === row && 
                    this.lastTouchedBlock.col === col) {
                    return;
                }

                const blockKey = `${row},${col}`;
                const existingIndex = this.selectedBlocks.findIndex(b => b.key === blockKey);
                
                // 如果已经选中，检查是否是回退操作
                if (existingIndex !== -1) {
                    // 如果触摸的是倒数第二个方块，说明是在回退
                    if (existingIndex === this.selectedBlocks.length - 2) {
                        this.selectedBlocks.pop();
                        this.lastTouchedBlock = { row, col };
                        this.updateBlockSelection();
                        this.updateSelectionLines();
                    }
                    return;
                }

                const firstBlock = this.selectedBlocks[0];
                
                // 检查数字是否相同
                if (value !== firstBlock.value) {
                    return;
                }

                // 检查是否与上一个选中的方块相邻
                if (!this.isAdjacent(this.lastTouchedBlock, { row, col })) {
                    return;
                }

                // 添加到选中列表
                this.selectedBlocks.push({ row, col, value, key: blockKey });
                this.lastTouchedBlock = { row, col };
                this.playSelectSound();
                this.updateBlockSelection();
                this.updateSelectionLines();

                // 更新题目
                if (this.selectedBlocks.length >= 2) {
                    this.updateQuestion();
                }
            }

            // 触摸结束
            handleTouchEnd() {
                if (!this.isDrawing) return;
                
                this.isDrawing = false;
                
                // 如果选中的方块少于2个，清除选择
                if (this.selectedBlocks.length < 2) {
                    this.clearSelection();
                } else {
                    // 保持选择状态，等待答题
                    this.updateQuestion();
                }
            }

            // 绘制选择连线
            updateSelectionLines() {
                this.clearSelectionLines();
                
                if (this.selectedBlocks.length < 2) return;

                const gameBoard = document.getElementById('gameBoard');
                const boardRect = gameBoard.getBoundingClientRect();

                for (let i = 0; i < this.selectedBlocks.length - 1; i++) {
                    const block1 = this.selectedBlocks[i];
                    const block2 = this.selectedBlocks[i + 1];
                    
                    const element1 = document.querySelector(`[data-row="${block1.row}"][data-col="${block1.col}"]`);
                    const element2 = document.querySelector(`[data-row="${block2.row}"][data-col="${block2.col}"]`);
                    
                    if (!element1 || !element2) continue;

                    const rect1 = element1.getBoundingClientRect();
                    const rect2 = element2.getBoundingClientRect();

                    const x1 = rect1.left + rect1.width / 2 - boardRect.left;
                    const y1 = rect1.top + rect1.height / 2 - boardRect.top;
                    const x2 = rect2.left + rect2.width / 2 - boardRect.left;
                    const y2 = rect2.top + rect2.height / 2 - boardRect.top;

                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

                    const line = document.createElement('div');
                    line.className = 'selection-line';
                    line.style.width = `${length}px`;
                    line.style.left = `${x1}px`;
                    line.style.top = `${y1}px`;
                    line.style.transform = `rotate(${angle}deg)`;

                    gameBoard.appendChild(line);
                    this.selectionLines.push(line);
                }
            }

            // 清除选择连线
            clearSelectionLines() {
                this.selectionLines.forEach(line => {
                    if (line.parentNode) {
                        line.parentNode.removeChild(line);
                    }
                });
                this.selectionLines = [];
            }

            updateQuestion() {
                const count = this.selectedBlocks.length;
                const number = this.selectedBlocks[0].value;
                const correctAnswer = count * number;

                // 生成两个错误答案
                const wrongAnswers = this.generateWrongAnswers(correctAnswer);
                const allAnswers = [correctAnswer, ...wrongAnswers];
                
                // 使用Fisher-Yates洗牌算法随机打乱答案顺序
                this.shuffleArray(allAnswers);

                this.currentQuestion = {
                    count,
                    number,
                    correctAnswer,
                    answers: allAnswers
                };

                this.renderQuestion();
            }

            // Fisher-Yates洗牌算法
            shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }

            generateWrongAnswers(correct) {
                const wrong = new Set();
                while (wrong.size < 2) {
                    const offset = Math.floor(Math.random() * 10) - 5;
                    if (offset !== 0) {
                        const wrongAnswer = correct + offset;
                        if (wrongAnswer > 0 && wrongAnswer !== correct) {
                            wrong.add(wrongAnswer);
                        }
                    }
                }
                return Array.from(wrong);
            }

            renderQuestion() {
                const questionArea = document.getElementById('questionArea');
                const { count, number, answers } = this.currentQuestion;

                questionArea.innerHTML = `
                    <div class="question-text">${count} × ${number} = ?</div>
                    <div class="answers">
                        ${answers.map(ans => `
                            <button class="answer-btn" onclick="game.checkAnswer(${ans})">${ans}</button>
                        `).join('')}
                    </div>
                `;
                
                // 为答案按钮添加触摸事件支持
                const answerButtons = questionArea.querySelectorAll('.answer-btn');
                answerButtons.forEach(btn => {
                    btn.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        if (!btn.disabled) {
                            const answer = parseInt(btn.textContent);
                            this.checkAnswer(answer);
                        }
                    });
                });
            }

            clearQuestionArea() {
                const questionArea = document.getElementById('questionArea');
                questionArea.innerHTML = `
                    <div class="empty-question">
                        选择相邻的相同数字色块开始游戏！
                    </div>
                `;
            }

            checkAnswer(answer) {
                if (!this.currentQuestion || this.answerLocked) return;

                // 锁定答题，防止重复点击
                this.answerLocked = true;

                this.totalAnswers++;
                const isCorrect = answer === this.currentQuestion.correctAnswer;

                if (isCorrect) {
                    this.handleCorrectAnswer();
                } else {
                    this.handleWrongAnswer(answer);
                }
            }

            handleCorrectAnswer() {
                this.correctAnswers++;
                this.combo++;
                
                // 播放正确音效
                this.playCorrectSound();
                
                // 计算得分（关卡越高，得分越高）
                const levelMultiplier = 1 + (this.level - 1) * 0.2; // 每关增加20%分数
                const baseScore = Math.round(this.selectedBlocks.length * 10 * levelMultiplier);
                const comboBonus = Math.round(this.combo * 5 * levelMultiplier);
                const earnedScore = baseScore + comboBonus;
                this.score += earnedScore;
                this.levelScore += earnedScore;

                // 显示正确反馈
                this.showAnswerFeedback(true);

                // 消除方块
                setTimeout(() => {
                    this.eliminateBlocks();
                    this.updateScore();
                    this.checkLevelComplete();
                }, 500);
            }

            handleWrongAnswer(answer) {
                this.combo = 0;
                
                // 播放错误音效
                this.playWrongSound();
                
                // 显示错误反馈
                this.showAnswerFeedback(false);

                // 清除选择
                setTimeout(() => {
                    this.clearSelection();
                    this.updateScore();
                }, 1000);
            }

            showAnswerFeedback(isCorrect) {
                const buttons = document.querySelectorAll('.answer-btn');
                buttons.forEach(btn => {
                    const btnAnswer = parseInt(btn.textContent);
                    if (isCorrect && btnAnswer === this.currentQuestion.correctAnswer) {
                        btn.classList.add('correct');
                    } else if (!isCorrect && btnAnswer === this.currentQuestion.correctAnswer) {
                        btn.classList.add('correct');
                    } else if (!isCorrect) {
                        btn.classList.add('wrong');
                    }
                    btn.disabled = true;
                });
            }

            eliminateBlocks() {
                // 播放消除音效
                this.playEliminateSound();
                
                // 清除连线
                this.clearSelectionLines();
                
                // 添加消除动画
                const blocks = document.querySelectorAll('.block.selected');
                blocks.forEach(block => {
                    block.style.animation = 'fadeOut 0.5s forwards';
                });

                // 更新board数组
                setTimeout(() => {
                    this.selectedBlocks.forEach(({ row, col }) => {
                        this.board[row][col] = null;
                    });

                    // 方块下落
                    this.dropBlocks();
                    
                    // 填充新方块
                    this.fillNewBlocks();
                    
                    // 重新渲染
                    this.renderBoard();
                    
                    // 清除选择
                    this.clearSelection();
                }, 500);
            }

            dropBlocks() {
                for (let col = 0; col < this.boardCols; col++) {
                    let emptyRow = this.boardRows - 1;
                    for (let row = this.boardRows - 1; row >= 0; row--) {
                        if (this.board[row][col] !== null) {
                            if (row !== emptyRow) {
                                this.board[emptyRow][col] = this.board[row][col];
                                this.board[row][col] = null;
                            }
                            emptyRow--;
                        }
                    }
                }
            }

            fillNewBlocks() {
                for (let row = 0; row < this.boardRows; row++) {
                    for (let col = 0; col < this.boardCols; col++) {
                        if (this.board[row][col] === null) {
                            this.board[row][col] = this.getRandomNumber();
                        }
                    }
                }
            }

            updateScore() {
                // 更新玩家名字
                const playerNameDisplay = document.getElementById('playerNameDisplay');
                if (playerNameDisplay) {
                    playerNameDisplay.textContent = this.playerName || '未登录';
                }
                
                document.getElementById('level').textContent = this.level;
                // 页面显示当前关卡分数
                document.getElementById('score').textContent = this.levelScore;
                document.getElementById('combo').textContent = this.combo;
                document.getElementById('target').textContent = this.targetScore;
                
                // 实时保存游戏记录
                this.saveGameRecord();
            }

            checkLevelComplete() {
                if (this.levelScore >= this.targetScore) {
                    // 过关
                    setTimeout(() => {
                        this.playCorrectSound();
                        
                        // 检查是否是第10关（最后一关）
                        if (this.level === 10) {
                            // 游戏全部通关，保存记录
                            this.saveGameRecord();
                            this.isGameActive = false;
                            
                            setTimeout(() => {
                                alert(`🎆 恭喜通关！🎆

你已经完成所有 10 个关卡！

总分：${this.score}
准确率：${this.totalAnswers > 0 ? Math.round(this.correctAnswers / this.totalAnswers * 100) : 0}%

你的成绩已保存，点击“重新开始”开启新挑战！`);
                            }, 300);
                            return;
                        }
                        
                        // 70%概率获得彩蛋
                        if (Math.random() < 0.7) {
                            this.showEgg();
                        } else {
                            alert(`🎉 恭喜过关！\n关卡 ${this.level} 完成\n本关得分：${this.levelScore}`);
                            this.nextLevel();
                        }
                    }, 500);
                }
            }

            // 显示彩蛋
            showEgg() {
                // 随机选择一个彩蛋类型
                const eggIndex = Math.floor(Math.random() * this.eggTypes.length);
                const egg = this.eggTypes[eggIndex];
                
                // 更新弹窗内容
                document.getElementById('eggIcon').textContent = egg.icon;
                document.getElementById('eggName').textContent = egg.name;
                document.getElementById('eggDesc').textContent = egg.desc;
                
                // 显示弹窗
                const modal = document.getElementById('eggModal');
                modal.classList.add('show');
                
                // 获得道具
                this.powerUps[egg.type]++;
                this.updatePowerUpsDisplay();
            }

            // 关闭彩蛋弹窗
            closeEggModal() {
                const modal = document.getElementById('eggModal');
                modal.classList.remove('show');
                
                // 检查是否是第10关
                if (this.level === 10) {
                    // 游戏全部通关，保存记录
                    this.saveGameRecord();
                    this.isGameActive = false;
                    
                    setTimeout(() => {
                        alert(`🎆 恭喜通关！🎆

你已经完成所有 10 个关卡！

总分：${this.score}
准确率：${this.totalAnswers > 0 ? Math.round(this.correctAnswers / this.totalAnswers * 100) : 0}%

你的成绩已保存，点击“重新开始”开启新挑战！`);
                    }, 300);
                    return;
                }
                
                // 弹窗关闭后进入下一关
                setTimeout(() => {
                    alert(`🎉 恭喜过关！\n关卡 ${this.level} 完成\n本关得分：${this.levelScore}`);
                    this.nextLevel();
                }, 300);
            }

            // 初始化道具
            initPowerUps() {
                // 炸弹
                document.getElementById('powerBomb').addEventListener('click', () => {
                    this.usePowerUp('bomb');
                });
                
                // 提示
                document.getElementById('powerHint').addEventListener('click', () => {
                    this.usePowerUp('hint');
                });
                
                // 洗牌
                document.getElementById('powerShuffle').addEventListener('click', () => {
                    this.usePowerUp('shuffle');
                });
                
                this.updatePowerUpsDisplay();
            }

            // 更新道具显示
            updatePowerUpsDisplay() {
                Object.keys(this.powerUps).forEach(type => {
                    const count = this.powerUps[type];
                    const btn = document.getElementById(`power${type.charAt(0).toUpperCase() + type.slice(1)}`);
                    const countSpan = btn.querySelector('.count');
                    countSpan.textContent = count;
                    
                    if (count === 0) {
                        btn.classList.add('disabled');
                    } else {
                        btn.classList.remove('disabled');
                    }
                });
            }

            // 使用道具
            usePowerUp(type) {
                if (this.powerUps[type] <= 0) {
                    alert('该道具已用完！');
                    return;
                }
                
                this.powerUps[type]--;
                this.updatePowerUpsDisplay();
                
                switch(type) {
                    case 'bomb':
                        this.useBomb();
                        break;
                    case 'hint':
                        this.useHint();
                        break;
                    case 'shuffle':
                        this.useShuffle();
                        break;
                }
            }

            // 使用炸弹：随机消除3x3区域
            useBomb() {
                const centerRow = Math.floor(Math.random() * (this.boardRows - 2)) + 1;
                const centerCol = Math.floor(Math.random() * (this.boardCols - 2)) + 1;
                
                // 消除3x3区域
                for (let r = centerRow - 1; r <= centerRow + 1; r++) {
                    for (let c = centerCol - 1; c <= centerCol + 1; c++) {
                        if (r >= 0 && r < this.boardRows && c >= 0 && c < this.boardCols) {
                            this.board[r][c] = null;
                        }
                    }
                }
                
                this.playEliminateSound();
                this.dropBlocks();
                this.fillNewBlocks();
                this.renderBoard();
            }

            // 使用提示：高亮可消除的方块
            useHint() {
                // 找出所有相邻相同的方块组
                for (let row = 0; row < this.boardRows; row++) {
                    for (let col = 0; col < this.boardCols; col++) {
                        const value = this.board[row][col];
                        if (value === null) continue;
                        
                        // 检查右方
                        if (col < this.boardCols - 1 && this.board[row][col + 1] === value) {
                            this.highlightBlock(row, col);
                            this.highlightBlock(row, col + 1);
                            return;
                        }
                        
                        // 检查下方
                        if (row < this.boardRows - 1 && this.board[row + 1][col] === value) {
                            this.highlightBlock(row, col);
                            this.highlightBlock(row + 1, col);
                            return;
                        }
                    }
                }
                
                alert('没有找到可消除的方块！');
            }

            // 高亮方块
            highlightBlock(row, col) {
                const blocks = document.querySelectorAll('.block');
                blocks.forEach(block => {
                    if (block.dataset.row == row && block.dataset.col == col) {
                        // 添加高亮类而不是直接修改样式
                        block.classList.add('hint-highlight');
                        
                        setTimeout(() => {
                            block.classList.remove('hint-highlight');
                        }, 2000);
                    }
                });
            }

            // 使用洗牌：重新随机打乱所有方块
            useShuffle() {
                const values = [];
                
                // 收集所有非空方块
                for (let row = 0; row < this.boardRows; row++) {
                    for (let col = 0; col < this.boardCols; col++) {
                        if (this.board[row][col] !== null) {
                            values.push(this.board[row][col]);
                        }
                    }
                }
                
                // 打乱
                this.shuffleArray(values);
                
                // 重新分配
                let index = 0;
                for (let row = 0; row < this.boardRows; row++) {
                    for (let col = 0; col < this.boardCols; col++) {
                        if (this.board[row][col] !== null) {
                            this.board[row][col] = values[index++];
                        }
                    }
                }
                
                this.renderBoard();
            }

            // ========== 玩家系统 ==========
            
            // 显示登录弹窗
            showLoginModal() {
                const modal = document.getElementById('loginModal');
                modal.classList.add('show');
                
                // 聚焦输入框
                setTimeout(() => {
                    document.getElementById('playerName').focus();
                }, 300);
                
                // 绑定回车键
                const input = document.getElementById('playerName');
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.startGame();
                    }
                });
            }
            
            // 开始游戏
            startGame() {
                const input = document.getElementById('playerName');
                const name = input.value.trim();
                
                if (!name) {
                    alert('请输入你的名字！');
                    return;
                }
                
                this.playerName = name;
                this.gameStartTime = new Date();
                this.isGameActive = true;
                // 生成唯一会话 ID
                this.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                // 关闭登录弹窗
                const modal = document.getElementById('loginModal');
                modal.classList.remove('show');
                
                // 重置游戏
                this.resetGame();
            }
            
            // 查看排行榜（从登录页）
            viewRankings() {
                this.showRankings();
            }
            
            // 初始化排行榜按钮
            initRankButton() {
                const rankBtn = document.getElementById('rankBtn');
                if (!rankBtn) return;
                
                rankBtn.addEventListener('click', () => {
                    this.showRankings();
                });
            }
            
            // 显示排行榜
            showRankings() {
                const records = this.getGameRecords();
                const rankList = document.getElementById('rankList');
                
                if (records.length === 0) {
                    rankList.innerHTML = '<div class="no-records">暂无游戏记录<br>快来挑战吧！</div>';
                } else {
                    rankList.innerHTML = records.map((record, index) => {
                        const rankClass = index === 0 ? 'top1' : index === 1 ? 'top2' : index === 2 ? 'top3' : '';
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                        const date = new Date(record.timestamp).toLocaleDateString('zh-CN');
                        const time = new Date(record.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
                        
                        return `
                            <li class="rank-item ${rankClass}">
                                <div class="rank-number">${medal || (index + 1)}</div>
                                <div class="rank-info">
                                    <div class="rank-name">${this.escapeHtml(record.playerName)}</div>
                                    <div class="rank-detail">
                                        关卡 ${record.level} · 准确率 ${record.accuracy}% · ${date} ${time}
                                    </div>
                                </div>
                                <div class="rank-score">${record.score}分</div>
                            </li>
                        `;
                    }).join('');
                }
                
                const modal = document.getElementById('rankModal');
                modal.classList.add('show');
            }
            
            // 关闭排行榜
            closeRankModal() {
                const modal = document.getElementById('rankModal');
                modal.classList.remove('show');
            }
            
            // 保存游戏记录（实时更新）
            saveGameRecord() {
                if (!this.playerName || !this.isGameActive) return;
                
                const currentRecord = {
                    playerName: this.playerName,
                    score: this.score,
                    level: this.level,
                    accuracy: this.totalAnswers > 0 ? Math.round(this.correctAnswers / this.totalAnswers * 100) : 0,
                    timestamp: new Date().getTime(),
                    playTime: this.gameStartTime ? Math.floor((new Date() - this.gameStartTime) / 1000) : 0,
                    sessionId: this.sessionId // 使用会话 ID 标识同一局游戏
                };
                
                const records = this.getGameRecords();
                
                // 查找当前会话的记录索引
                const existingIndex = records.findIndex(r => r.sessionId === this.sessionId);
                
                if (existingIndex !== -1) {
                    // 更新现有记录
                    records[existingIndex] = currentRecord;
                } else {
                    // 添加新记录
                    records.push(currentRecord);
                }
                
                // 按分数排序
                records.sort((a, b) => b.score - a.score);
                
                // 只保留前50名
                const topRecords = records.slice(0, 50);
                
                localStorage.setItem('multiplicationGameRecords', JSON.stringify(topRecords));
            }
            
            // 获取游戏记录
            getGameRecords() {
                const data = localStorage.getItem('multiplicationGameRecords');
                return data ? JSON.parse(data) : [];
            }
            
            // HTML转义
            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
            
            // 重置游戏
            resetGame() {
                this.level = 1;
                this.score = 0;
                this.levelScore = 0;
                this.targetScore = 500;
                this.combo = 0;
                this.correctAnswers = 0;
                this.totalAnswers = 0;
                this.selectedBlocks = [];
                this.currentQuestion = null;
                this.answerLocked = false;
                this.isDrawing = false;
                this.lastTouchedBlock = null;
                
                // 重置棋盘大小
                this.updateBoardSize();
                
                // 清除连线
                this.clearSelectionLines();
                
                // 重新初始化游戏板
                this.initBoard();
                this.renderBoard();
                this.updateScore();
                this.clearQuestionArea();
            }

            nextLevel() {
                // 防止超过10关
                if (this.level >= 10) {
                    return;
                }
                
                this.level++;
                // 不清空总分，让分数累加
                this.levelScore = 0; // 重置当前关卡分数
                this.combo = 0; // 重置连击
                this.correctAnswers = 0;
                this.totalAnswers = 0;
                
                // 难度递增设计：
                // 关卡1-3: 目标500分
                // 关卡4-6: 目标700分
                // 关卡7-9: 目标900分
                // 关卡10: 目怇1100分
                if (this.level <= 3) {
                    this.targetScore = 500;
                } else if (this.level <= 6) {
                    this.targetScore = 700;
                } else if (this.level <= 9) {
                    this.targetScore = 900;
                } else {
                    this.targetScore = 1100;
                }
                
                // 更新棋盘大小
                this.updateBoardSize();
                
                // 增加难度：更大的棋盘需要更多聚类
                this.initBoard();
                this.renderBoard();
                this.updateScore();
                this.clearSelection();
            }
        }

        // 启动游戏
        const game = new MultiplicationGame();
