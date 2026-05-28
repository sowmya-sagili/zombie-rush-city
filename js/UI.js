class UIEngine {
    constructor() {
        // Cache DOM elements
        this.startOverlay = null;
        this.hudOverlay = null;
        this.shopOverlay = null;
        this.gameoverOverlay = null;

        this.scoreVal = null;
        this.capsulesVal = null;
        this.comboBadge = null;
        this.comboVal = null;

        // Upgrade nodes
        this.btnBuyWeapon = null;
        this.weaponCostText = null;
        this.weaponDescText = null;
        this.btnBuySuit = null;
        this.suitCostText = null;
        this.suitDescText = null;
        this.btnBuyHammer = null;
        this.hammerCostText = null;
        this.hammerDescText = null;
        this.btnBuyGold = null;
        this.goldCostText = null;
        this.goldDescText = null;
        this.btnBuyMagnet = null;
        this.magnetCostText = null;
        this.magnetDescText = null;

        // Game over stats
        this.goScore = null;
        this.goHigh = null;
        this.goCapsules = null;
        this.goCapsulesBank = null;
        this.goKills = null;

        this.shopCameFromGameOver = false;

        // Upgrade Prices
        this.weaponCosts = [25, 60, 9999]; // Tier 0 -> Tier 1: 25. Tier 1 -> Tier 2: 60. Max: Maxed.
        this.weaponNames = ["Baseball Bat", "Cyber Katana", "Plasma Hammer"];
        this.weaponDescriptions = [
            "Heavy melee swing, range: 2.6m",
            "Neon energy blade, range: 3.6m, swing faster!",
            "Plasma crusher, range: 4.6m, massive shockwave!"
        ];
    }

    init(onStart, onBuyUpgrade, onRestart) {
        this.startOverlay = document.getElementById('start-overlay');
        this.hudOverlay = document.getElementById('hud');
        this.shopOverlay = document.getElementById('shop-overlay');
        this.gameoverOverlay = document.getElementById('gameover-overlay');

        this.scoreVal = document.getElementById('score-val');
        this.capsulesVal = document.getElementById('capsules-val');
        this.comboBadge = document.getElementById('combo-badge');
        this.comboVal = document.getElementById('combo-val');

        this.btnBuyWeapon = document.getElementById('btn-buy-weapon');
        this.weaponCostText = document.getElementById('weapon-cost');
        this.weaponDescText = document.getElementById('weapon-desc');
        this.btnBuySuit = document.getElementById('btn-buy-suit');
        this.suitCostText = document.getElementById('suit-cost');
        this.suitDescText = document.getElementById('suit-desc');
        this.btnBuyHammer = document.getElementById('btn-buy-hammer');
        this.hammerCostText = document.getElementById('hammer-cost');
        this.hammerDescText = document.getElementById('hammer-desc');
        this.btnBuyGold = document.getElementById('btn-buy-gold');
        this.goldCostText = document.getElementById('gold-cost');
        this.goldDescText = document.getElementById('gold-desc');
        this.btnBuyMagnet = document.getElementById('btn-buy-magnet');
        this.magnetCostText = document.getElementById('magnet-cost');
        this.magnetDescText = document.getElementById('magnet-desc');

        this.goScore = document.getElementById('go-score');
        this.goHigh = document.getElementById('go-high');
        this.goCapsules = document.getElementById('go-capsules');
        this.goCapsulesBank = document.getElementById('go-capsules-bank');
        this.goKills = document.getElementById('go-kills');

        // Button clicks
        document.getElementById('btn-start').addEventListener('click', () => {
            this.showStart(false);
            this.showHUD(true);
            onStart();
        });

        document.getElementById('btn-close-shop').addEventListener('click', () => {
            this.showShop(false);
            if (this.shopCameFromGameOver) {
                this.shopCameFromGameOver = false;
                onRestart();
            }
        });

        this.btnBuyWeapon.addEventListener('click', () => {
            onBuyUpgrade('weapon');
        });

        this.btnBuySuit.addEventListener('click', () => {
            onBuyUpgrade('suit');
        });

        this.btnBuyHammer.addEventListener('click', () => {
            onBuyUpgrade('hammer');
        });

        this.btnBuyGold.addEventListener('click', () => {
            onBuyUpgrade('gold');
        });

        this.btnBuyMagnet.addEventListener('click', () => {
            onBuyUpgrade('magnet');
        });

        const btnResetProgress = document.getElementById('btn-reset-progress');
        if (btnResetProgress) {
            btnResetProgress.addEventListener('click', () => {
                if (confirm("Are you sure you want to reset all upgrades and capsules? This will start you from zero progress.")) {
                    onBuyUpgrade('reset');
                }
            });
        }

        document.getElementById('btn-restart').addEventListener('click', () => {
            this.showGameOver(false);
            this.showHUD(true);
            onRestart();
        });

        document.getElementById('btn-shop-from-go').addEventListener('click', () => {
            this.showGameOver(false);
            const capsules = window.game ? window.game.capsules : 0;
            const weaponTier = window.game ? window.game.weaponTier : 0;
            const suitTier = window.game ? window.game.suitTier : 0;
            const magnetUnlocked = window.game ? window.game.magnetUnlocked : 0;
            this.showShop(true, capsules, weaponTier, suitTier, magnetUnlocked, true);
        });
    }

    showStart(visible) {
        if (visible) {
            this.startOverlay.classList.add('active');
            this.startOverlay.style.display = 'flex';
        } else {
            this.startOverlay.classList.remove('active');
            setTimeout(() => this.startOverlay.style.display = 'none', 400);
        }
    }

    showHUD(visible) {
        this.hudOverlay.style.opacity = visible ? '1' : '0';
    }

    showShop(visible, currentCapsules = 0, currentWeaponTier = 0, suitTier = 0, magnetUnlocked = 0, cameFromGameOver = false) {
        if (visible) {
            this.shopCameFromGameOver = cameFromGameOver;
            const closeBtn = document.getElementById('btn-close-shop');
            if (closeBtn) {
                closeBtn.innerText = cameFromGameOver ? "START AGAIN" : "RESUME PLAY";
            }
            this.shopOverlay.classList.add('active');
            this.shopOverlay.style.display = 'flex';
            this.updateShopButtons(currentCapsules, currentWeaponTier, suitTier, magnetUnlocked);
        } else {
            this.shopOverlay.classList.remove('active');
            setTimeout(() => this.shopOverlay.style.display = 'none', 400);
        }
    }

    updateShopButtons(capsules, weaponTier, suitTier, magnetUnlocked) {
        // 1. Weapon Upgrade 1 (Cyber Katana)
        if (weaponTier >= 1) {
            this.weaponCostText.innerText = "MAX";
            this.weaponDescText.innerText = "Cyber Katana synthesized! Swing range: 3.6m.";
            this.btnBuyWeapon.innerText = "MAXED";
            this.btnBuyWeapon.className = "btn-buy maxed";
            this.btnBuyWeapon.disabled = true;
        } else {
            this.weaponCostText.innerText = "25";
            this.weaponDescText.innerText = "Unlock Cyber Katana: Glowing energy blade, range: 3.6m.";
            this.btnBuyWeapon.innerText = "UPGRADE";
            this.btnBuyWeapon.disabled = (capsules < 25);
            this.btnBuyWeapon.className = (capsules >= 25) ? "btn-buy" : "btn-buy disabled";
        }

        // 2. Suit Upgrade 1 (Cyber Suit)
        if (suitTier >= 1) {
            this.suitCostText.innerText = "MAX";
            this.suitDescText.innerText = "Cyber Suit synthesized! Glowing pink armor active.";
            this.btnBuySuit.innerText = "MAXED";
            this.btnBuySuit.className = "btn-buy maxed";
            this.btnBuySuit.disabled = true;
        } else {
            this.suitCostText.innerText = "60";
            this.suitDescText.innerText = "Unlock Cyber Suit: Glowing pink cyber armor.";
            this.btnBuySuit.innerText = "UPGRADE";
            this.btnBuySuit.disabled = (capsules < 60);
            this.btnBuySuit.className = (capsules >= 60) ? "btn-buy" : "btn-buy disabled";
        }

        // 3. Weapon Upgrade 2 (Doom Hammer)
        if (weaponTier >= 2) {
            this.hammerCostText.innerText = "MAX";
            this.hammerDescText.innerText = "Doom Hammer synthesized! Range: 4.6m, massive shockwave.";
            this.btnBuyHammer.innerText = "MAXED";
            this.btnBuyHammer.className = "btn-buy maxed";
            this.btnBuyHammer.disabled = true;
        } else if (weaponTier === 0) {
            this.hammerCostText.innerText = "LOCKED";
            this.hammerDescText.innerText = "Requires Weaponry Synthesis I (Cyber Katana).";
            this.btnBuyHammer.innerText = "LOCKED";
            this.btnBuyHammer.className = "btn-buy disabled";
            this.btnBuyHammer.disabled = true;
        } else {
            this.hammerCostText.innerText = "500";
            this.hammerDescText.innerText = "Unlock Doom Hammer: Range 4.6m, massive shockwave.";
            this.btnBuyHammer.innerText = "UPGRADE";
            this.btnBuyHammer.disabled = (capsules < 500);
            this.btnBuyHammer.className = (capsules >= 500) ? "btn-buy" : "btn-buy disabled";
        }

        // 4. Suit Upgrade 2 (Quantum Gold Armor)
        if (suitTier >= 2) {
            this.goldCostText.innerText = "MAX";
            this.goldDescText.innerText = "Quantum Armor synthesized! Glowing radiant gold weave active.";
            this.btnBuyGold.innerText = "MAXED";
            this.btnBuyGold.className = "btn-buy maxed";
            this.btnBuyGold.disabled = true;
        } else if (suitTier === 0) {
            this.goldCostText.innerText = "LOCKED";
            this.goldDescText.innerText = "Requires Cyber Suit Synthesis I.";
            this.btnBuyGold.innerText = "LOCKED";
            this.btnBuyGold.className = "btn-buy disabled";
            this.btnBuyGold.disabled = true;
        } else {
            this.goldCostText.innerText = "1000";
            this.goldDescText.innerText = "Unlock Quantum Armor: Radiant gold weave armor.";
            this.btnBuyGold.innerText = "UPGRADE";
            this.btnBuyGold.disabled = (capsules < 1000);
            this.btnBuyGold.className = (capsules >= 1000) ? "btn-buy" : "btn-buy disabled";
        }

        // 5. Magnet Upgrade (Vortex Magnet)
        if (magnetUnlocked >= 1) {
            this.magnetCostText.innerText = "MAX";
            this.magnetDescText.innerText = "Vortex Magnet active! Automatically pulls nearby capsules.";
            this.btnBuyMagnet.innerText = "MAXED";
            this.btnBuyMagnet.className = "btn-buy maxed";
            this.btnBuyMagnet.disabled = true;
        } else {
            this.magnetCostText.innerText = "5000";
            this.magnetDescText.innerText = "Unlock Vortex Magnet: Pulls capsules from adjacent lanes.";
            this.btnBuyMagnet.innerText = "UPGRADE";
            this.btnBuyMagnet.disabled = (capsules < 5000);
            this.btnBuyMagnet.className = (capsules >= 5000) ? "btn-buy" : "btn-buy disabled";
        }
    }

    showGameOver(visible, finalScore = 0, highscore = 0, capsules = 0, kills = 0, totalBank = 0) {
        if (visible) {
            this.animateValue(this.goScore, 0, finalScore, 800);
            this.animateValue(this.goCapsules, 0, capsules, 800);
            this.goHigh.innerText = highscore;
            if (this.goCapsulesBank) {
                this.goCapsulesBank.innerText = totalBank;
            }

            this.showHUD(false);
            this.gameoverOverlay.classList.add('active');
            this.gameoverOverlay.style.display = 'flex';
        } else {
            this.gameoverOverlay.classList.remove('active');
            setTimeout(() => this.gameoverOverlay.style.display = 'none', 400);
        }
    }

    updateHUD(score, highscore, capsules, comboVal) {
        this.scoreVal.innerText = score;
        this.capsulesVal.innerText = capsules;

        if (comboVal > 1) {
            this.comboVal.innerText = `${comboVal}X`;
            this.comboBadge.classList.add('active');
            
            // Pop effect
            this.comboBadge.style.transform = 'scale(1.25)';
            setTimeout(() => {
                this.comboBadge.style.transform = 'scale(1)';
            }, 100);
        } else {
            this.comboBadge.classList.remove('active');
        }
    }

    spawnFloatingText(text, x, y, color = '#00ffcc') {
        const popup = document.createElement('div');
        popup.innerText = text;
        popup.style.position = 'absolute';
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.fontFamily = 'Orbitron, sans-serif';
        popup.style.fontSize = '24px';
        popup.style.fontWeight = '900';
        popup.style.color = color;
        popup.style.textShadow = `0 0 10px ${color}`;
        popup.style.pointerEvents = 'none';
        popup.style.zIndex = '50';
        popup.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        document.body.appendChild(popup);

        // Animate up and fade out
        requestAnimationFrame(() => {
            popup.style.top = `${y - 80}px`;
            popup.style.opacity = '0';
        });

        setTimeout(() => {
            popup.remove();
        }, 600);
    }

    animateValue(element, start, end, duration) {
        if (!element) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            element.innerText = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                element.innerText = end;
            }
        };
        window.requestAnimationFrame(step);
    }
}

// Global single instance export
const UI = new UIEngine();
