// Toast Notification System
// Usage: showToast('Message', 'success' | 'error' | 'info');

(function () {
    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647; /* Max Z-Index to ensure it's on top of everything */
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }
        
        .toast {
            min-width: 300px;
            max-width: 400px;
            background: #fff;
            color: #333;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease-out forwards;
            pointer-events: auto;
            border-left: 5px solid #333;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .toast.success { border-left-color: #10b981; }
        .toast.error { border-left-color: #ef4444; }
        .toast.info { border-left-color: #3b82f6; }
        
        .toast-icon { font-size: 20px; }
        
        .toast.hide {
            animation: slideOut 0.3s ease-in forwards;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Global Function
    window.showToast = function (message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 4000);
    };
    // Confirm Modal Styles
    const confirmStyle = `
        .confirm-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            animation: fadeIn 0.2s ease-out;
            backdrop-filter: blur(2px);
        }
        
        .confirm-modal {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: scaleIn 0.2s ease-out;
            font-family: 'Inter', sans-serif;
        }
        
        .confirm-message {
            margin-bottom: 25px;
            font-size: 16px;
            color: #333;
            line-height: 1.5;
        }
        
        .confirm-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
        }
        
        .confirm-btn {
            padding: 10px 25px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.1s;
        }
        
        .confirm-btn:active { transform: scale(0.95); }
        
        .confirm-btn.yes {
            background: #473c39;
            color: white;
        }
        
        .confirm-btn.no {
            background: #e0e0e0;
            color: #333;
        }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;

    style.innerHTML += confirmStyle;

    // Global Confirm Function (Promise-based)
    window.showConfirm = function (message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';

            overlay.innerHTML = `
                <div class="confirm-modal">
                    <p class="confirm-message">${message}</p>
                    <div class="confirm-actions">
                        <button class="confirm-btn no" id="confirmCtxNo">Cancel</button>
                        <button class="confirm-btn yes" id="confirmCtxYes">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const btnYes = overlay.querySelector('#confirmCtxYes');
            const btnNo = overlay.querySelector('#confirmCtxNo');

            function close(result) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 200);
                resolve(result);
            }

            btnYes.onclick = () => close(true);
            btnNo.onclick = () => close(false);

            // Close on click outside (optional)
            overlay.onclick = (e) => {
                if (e.target === overlay) close(false);
            };
        });
    };
})();
