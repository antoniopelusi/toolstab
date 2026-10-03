class DynamicBackground {
    timeColors = [
        { hour:  0, color: "#1c304b" },
        { hour:  3, color: "#41405d" },
        { hour:  6, color: "#f3ae5d" },
        { hour:  9, color: "#74c3e1" },
        { hour: 12, color: "#57b0d9" },
        { hour: 15, color: "#6d9cc3" },
        { hour: 18, color: "#e48959" },
        { hour: 21, color: "#314867" },
    ];

    // 5 blobs with varying sizes — positions assigned at init
    blobs = [
        { rx: 55, ry: 45, speed: 0.007 },
        { rx: 35, ry: 30, speed: 0.010 },
        { rx: 45, ry: 38, speed: 0.006 },
        { rx: 25, ry: 22, speed: 0.012 },
        { rx: 30, ry: 28, speed: 0.009 },
    ];

    getColor() {
        const now  = new Date();
        const hour = now.getHours() + now.getMinutes() / 60;

        let i = 0;
        while (i < this.timeColors.length - 1 && hour >= this.timeColors[i + 1].hour) i++;

        const curr   = this.timeColors[i];
        const next   = this.timeColors[i + 1] || { hour: 24, color: this.timeColors[0].color };
        const factor = (hour - curr.hour) / (next.hour - curr.hour);

        const hex2rgb = (hex) => hex.match(/\w\w/g).map((x) => parseInt(x, 16));
        const [r1, g1, b1] = hex2rgb(curr.color);
        const [r2, g2, b2] = hex2rgb(next.color);

        return [
            Math.round(r1 + (r2 - r1) * factor),
            Math.round(g1 + (g2 - g1) * factor),
            Math.round(b1 + (b2 - b1) * factor),
        ];
    }

    applyGradient(r, g, b) {
        const bg  = "#323232";
        const col = `rgba(${r},${g},${b},0.55)`;

        const layers = [
            // Top fade — softens blobs approaching the top edge
            `linear-gradient(to bottom, ${bg} 0%, transparent 22%)`,
        ];

        for (const blob of this.blobs) {
            layers.push(
                `radial-gradient(ellipse ${blob.rx}% ${blob.ry}% at ${blob.x.toFixed(2)}% ${blob.y.toFixed(2)}%, ${col} 0%, transparent 100%)`
            );
        }

        layers.push(bg);
        document.body.style.background = layers.join(", ");
    }

    randomPos() {
        return { x: Math.random() * 100, y: Math.random() * 100 };
    }

    pickNewTarget(blob) {
        blob.tx = Math.random() * 100;
        blob.ty = Math.random() * 100;
    }

    stepBlobs() {
        for (const blob of this.blobs) {
            blob.x += (blob.tx - blob.x) * blob.speed;
            blob.y += (blob.ty - blob.y) * blob.speed;

            if (Math.hypot(blob.tx - blob.x, blob.ty - blob.y) < 0.4) {
                this.pickNewTarget(blob);
            }
        }
    }

    update() {
        const enabled = localStorage.getItem("dynamicBackground") === "true";
        if (!enabled) {
            document.body.style.removeProperty("background");
            return;
        }
        const [r, g, b] = this.getColor();
        this.applyGradient(r, g, b);
    }

    init() {
        // Distribute blobs evenly across the screen at startup
        const cols = 3;
        this.blobs.forEach((blob, i) => {
            const col  = i % cols;
            const row  = Math.floor(i / cols);
            // Cell centers with small jitter so they don't sit on a perfect grid
            blob.x  = (col + 0.5) / cols  * 100 + (Math.random() - 0.5) * 15;
            blob.y  = (row + 0.5) / 2     * 100 + (Math.random() - 0.5) * 15;
            blob.tx = blob.x;
            blob.ty = blob.y;
            // Immediately pick a random target so each blob starts moving
            this.pickNewTarget(blob);
        });

        this.update();
        setInterval(() => this.update(), 60000);

        const tick = () => {
            if (localStorage.getItem("dynamicBackground") === "true") {
                this.stepBlobs();
                const [r, g, b] = this.getColor();
                this.applyGradient(r, g, b);
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        window.addEventListener("storage", () => this.update());
    }
}
