// WebSocket connection
let ws = null;
let reconnectInterval = null;

// Connect to WebSocket server
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8080/ws');
    
    ws.onopen = () => {
        console.log('[WebSocket] Connected to server');
        clearInterval(reconnectInterval);
    };
    
    ws.onmessage = (event) => {
        const state = JSON.parse(event.data);
        console.log('[WebSocket] State received:', state);
        updateDashboard(state);
    };
    
    ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
    };
    
    ws.onclose = () => {
        console.log('[WebSocket] Disconnected. Attempting to reconnect...');
        reconnectInterval = setInterval(() => {
            console.log('[WebSocket] Reconnecting...');
            connectWebSocket();
        }, 3000);
    };
}

// Update dashboard based on state
function updateDashboard(state) {
    // Update leaderboard
    updateLeaderboard(state.leaderboard);
    
    // Update timer
    document.getElementById('timerDisplay').textContent = state.timer;
    
    // Update timer status
    const timerStatus = document.getElementById('timerStatus');
    if (state.timer_running) {
        timerStatus.textContent = 'Running';
        timerStatus.classList.remove('paused');
    } else {
        timerStatus.textContent = 'Paused';
        timerStatus.classList.add('paused');
    }
    
    // Update progress
    updateProgress(state.progress);
    
    // Update completed time
    const completedDisplay = document.getElementById('completedTimeDisplay');
    const completedText = document.getElementById('completedTimeText');
    if (state.completed_time) {
        completedText.textContent = `Completed: ${state.completed_time}`;
        completedDisplay.classList.add('visible');
    } else {
        completedDisplay.classList.remove('visible');
    }
    
    // Update current team name
    if (state.current_team) {
        document.getElementById('teamRacing').textContent = `${state.current_team}'s team is racing`;
    }
    
    // Update custom message
    if (state.custom_message) {
        document.getElementById('customMessage').textContent = state.custom_message;
    }
    
    // Switch display mode
    switchDisplayMode(state.display_mode);
}

// Update leaderboard
function updateLeaderboard(teams) {
    const leaderboardList = document.getElementById('leaderboardList');
    const emptyState = document.getElementById('emptyState');
    
    if (teams.length === 0) {
        emptyState.classList.add('visible');
        leaderboardList.innerHTML = '';
        return;
    }
    
    emptyState.classList.remove('visible');
    leaderboardList.innerHTML = '';
    
    teams.forEach((team, index) => {
        const rank = index + 1;
        const card = document.createElement('div');
        card.className = 'team-card';
        
        let rankClass = 'rank-other';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';
        
        card.innerHTML = `
            <div class="rank-badge ${rankClass}">${rank}</div>
            <div class="team-info">
                <div class="team-name">
                    <span class="material-icons">person</span>
                    ${team.name}
                </div>
                <div class="team-time">
                    <span class="material-icons">timer</span>
                    ${team.time}
                </div>
            </div>
        `;
        
        leaderboardList.appendChild(card);
        
        // Animate entry
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateX(-20px)';
            requestAnimationFrame(() => {
                card.style.transition = 'all 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
            });
        }, 10);
    });
}

// Update progress bar
function updateProgress(percentage) {
    const progressBar = document.getElementById('progressBar');
    const progressLabel = document.getElementById('progressLabel');
    
    progressBar.style.width = percentage + '%';
    progressLabel.textContent = `${percentage}% Complete`;
}

// Switch display mode
function switchDisplayMode(mode) {
    const views = {
        'default': document.getElementById('defaultView'),
        'race': document.getElementById('raceView'),
        'paused': document.getElementById('pausedView'),
        'leaderboard': document.getElementById('leaderboardOnlyView'),
        'custom': document.getElementById('customView')
    };
    
    // Hide all views
    Object.values(views).forEach(view => {
        view.classList.remove('active');
    });
    
    // Show active view
    if (views[mode]) {
        views[mode].classList.add('active');
    }
}

// Initialize dashboard
function init() {
    console.log('[Dashboard] Initializing...');
    connectWebSocket();
    
    // Set default view
    document.getElementById('defaultView').classList.add('active');
}

// Start when page loads
window.addEventListener('load', init);

// Update checkpoint indicators based on progress
function updateCheckpoints(percentage) {
    console.log('[Dashboard] Updating checkpoints for progress:', percentage + '%');
    
    const checkpoints = [
        { threshold: 25, checkpoint: 1 },
        { threshold: 50, checkpoint: 2 },
        { threshold: 75, checkpoint: 3 },
        { threshold: 100, checkpoint: 4 }
    ];
    
    checkpoints.forEach((cp, index) => {
        const checkpointItem = document.querySelector(`.checkpoint-item[data-checkpoint="${cp.checkpoint}"]`);
        
        if (checkpointItem) {
            if (percentage >= cp.threshold) {
                if (!checkpointItem.classList.contains('reached')) {
                    console.log('[Dashboard] Checkpoint', cp.checkpoint, 'reached!');
                }
                checkpointItem.classList.add('reached');
            } else {
                checkpointItem.classList.remove('reached');
            }
        }
        
        // Update connecting lines
        if (index < checkpoints.length - 1) {
            const lines = document.querySelectorAll('.checkpoint-line');
            const line = lines[index];
            
            if (line) {
                if (percentage >= cp.threshold) {
                    line.classList.add('completed');
                } else {
                    line.classList.remove('completed');
                }
            }
        }
    });
}

// Monitor progress bar changes
function observeProgressBar() {
    const progressBar = document.getElementById('progressBar');
    
    if (!progressBar) {
        console.log('[Dashboard] Progress bar not found, retrying...');
        setTimeout(observeProgressBar, 100);
        return;
    }
    
    console.log('[Dashboard] Monitoring progress bar for changes');
    
    // Use MutationObserver to watch for style changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const width = progressBar.style.width;
                if (width) {
                    const percentage = parseInt(width);
                    if (!isNaN(percentage)) {
                        updateCheckpoints(percentage);
                    }
                }
            }
        });
    });
    
    observer.observe(progressBar, {
        attributes: true,
        attributeFilter: ['style']
    });
    
    // Also check initial state
    const initialWidth = progressBar.style.width;
    if (initialWidth) {
        const percentage = parseInt(initialWidth);
        if (!isNaN(percentage)) {
            updateCheckpoints(percentage);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Dashboard] Dashboard script loaded and ready');
    observeProgressBar();
});

console.log('[Dashboard] Script loaded');