class CoinHandler {
    constructor(interaction, dbUser) {
        if (!interaction || !dbUser) return;

        this.interval = null;
        this.dbUser = dbUser;
        this.interaction = interaction;
        this.coins = 0;
    }

    getSeason() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const isWeekend = now.getDay() === 6 || now.getDay() === 7;

        const specials = [
            { check: month === 8 && day === 30, season: 'birthday', multiplier: 6 },
            { check: month === 4 && day === 5, season: 'easter', multiplier: 4 },
            { check: month === 10 && day === 31, season: 'halloween', multiplier: 4 },
            { check: month === 12 && day === 25, season: 'christmas', multiplier: 4 },
            { check: this.interaction.guildID === "1449610719552339980", season: 'nukie bear', multiplier: isWeekend ? 6 : 4 }
        ]

        for (const special of specials) {
            if (special.check) return { season: special.season, multiplier: special.multiplier }
        }

        const isWinter = (month === 12 && day >= 21) || (month < 3) || (month === 3 && day < 20);
        const isSpring = (month === 3 && day >= 20) || (month > 3 && month < 6) || (month === 6 && day < 21);
        const isSummer = (month === 6 && day >= 21) || (month > 6 && month < 9) || (month === 9 && day < 22);

        if (isWinter) return { season: 'winter', multiplier: isWeekend ? 4 : 2 }
        if (isSpring) return { season: 'spring', multiplier: isWeekend ? 4 : 2  }
        if (isSummer) return { season: 'summer', multiplier: isWeekend ? 4 : 2  }

        return { season: 'normal', multiplier: isWeekend ? 2 : 1 }
    }

    start() {
        // Make sure entirely by setting it to 0 again
        this.coins = 0;

        this.interval = setInterval(() => {
            this.coins += 1
        }, 2000)
    }

    async reward() {
        this.end();

        if (!this.coins || this.coins <= 0) return 0;

        const season = this.getSeason();
        const coinsRewarded = ~~(this.coins * season.multiplier)

        this.dbUser.coins += coinsRewarded;

        // ParallelSaveError Can't save() the same doc multiple times in parallel. my ass, it still saves either way..
        try {
            await this.dbUser.save();
        } catch (err) {}

        return coinsRewarded;
    }

    end() {
        if (!this.interval) return;
        
        clearInterval(this.interval);
    }
}

module.exports = CoinHandler;