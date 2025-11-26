class AdManager {
    constructor() {
        this.adConfig = {
            bannerRefreshTime: 30000,
            interstitialFrequency: 0.3
        };
        this.init();
    }

    init() {
        this.setupAdSense();
        this.trackAdPerformance();
    }

    setupAdSense() {
        // Для реального использования раскомментируйте:
        /*
        (adsbygoogle = window.adsbygoogle || []).push({});
        
        setInterval(() => {
            this.refreshAds();
        }, this.adConfig.bannerRefreshTime);
        */
    }

    refreshAds() {
        try {
            if (typeof adsbygoogle !== 'undefined') {
                (adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (error) {
            console.log('Ad refresh error:', error);
        }
    }

    showInterstitialAd() {
        if (this.shouldShowInterstitial()) {
            this.createMockInterstitial();
        }
    }

    shouldShowInterstitial() {
        return Math.random() < this.adConfig.interstitialFrequency && !this.isPremiumUser();
    }

    createMockInterstitial() {
        const interstitial = document.createElement('div');
        interstitial.innerHTML = `
            <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white;">
                <h3>Рекламный перерыв</h3>
                <div style="width:300px; height:250px; background:#444; margin:20px; display:flex; align-items:center; justify-content:center;">
                    Место для рекламы
                </div>
                <p>Поддержите разработчика - просмотрите рекламу</p>
                <button onclick="this.parentElement.parentElement.remove()" style="padding:10px 20px; background:#4CAF50; color:white; border:none; border-radius:5px; cursor:pointer;">
                    Продолжить
                </button>
            </div>
        `;
        document.body.appendChild(interstitial);
    }

    trackAdPerformance() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.adsbygoogle')) {
                this.logAdClick();
            }
        });
    }

    logAdClick() {
        const analytics = {
            timestamp: new Date().toISOString(),
            type: 'ad_click',
            page: window.location.pathname
        };
        console.log('Ad click tracked:', analytics);
    }

    isPremiumUser() {
        return localStorage.getItem('premiumUser') === 'true';
    }
}

// Инициализация менеджера рекламы
new AdManager();