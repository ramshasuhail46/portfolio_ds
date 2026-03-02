"use client";

import React, { useEffect, useRef } from 'react';

interface FluidBackgroundProps {
    className?: string;
}

const FluidBackground: React.FC<FluidBackgroundProps> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Simulation parameters
        const config = {
            SIM_RESOLUTION: 128,
            DYE_RESOLUTION: 1024,
            CAPTURE_RESOLUTION: 512,
            DENSITY_DISSIPATION: 0.8,
            VELOCITY_DISSIPATION: 0.4,
            PRESSURE: 0.1,
            PRESSURE_ITERATIONS: 20,
            CURL: 2,
            SPLAT_RADIUS: 0.12,
            SPLAT_FORCE: 150,
            SHADING: true,
            COLORFUL: true,
            COLOR_UPDATE_SPEED: 10,
            PAUSED: false,
            BACK_COLOR: { r: 255, g: 255, b: 255 },
            TRANSPARENT: true,
            BLOOM: true,
            BLOOM_ITERATIONS: 8,
            BLOOM_RESOLUTION: 256,
            BLOOM_INTENSITY: 0.3,
            BLOOM_THRESHOLD: 0.7,
            BLOOM_SOFT_KNEE: 0.7,
            SUNRAYS: false,
            SUNRAYS_RESOLUTION: 196,
            SUNRAYS_WEIGHT: 1.0,
        };

        // Predefined colors: lavender, soft blue, mint green
        const colors = [
            { r: 150 / 255, g: 123 / 255, b: 182 / 255 }, // Deep Lavender
            { r: 0 / 255, g: 255 / 255, b: 255 / 255 },   // Electric Cyan
            { r: 255 / 255, g: 102 / 255, b: 255 / 255 }, // Soft Magenta
        ];

        let pointerCount = 0;
        const pointers: any[] = [];
        const splatStack: any[] = [];

        const { gl, ext } = getWebGLContext(canvas);

        if (!ext.supportLinearFiltering) {
            config.DYE_RESOLUTION = 512;
            config.SHADING = false;
            config.BLOOM = false;
            config.SUNRAYS = false;
        }

        function getWebGLContext(canvas: HTMLCanvasElement) {
            const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
            let gl = canvas.getContext('webgl2', params) as any;
            const isWebGL2 = !!gl;
            if (!isWebGL2) gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as any;

            const halfFloat = isWebGL2 ? gl.HALF_FLOAT : (gl.getExtension('OES_texture_half_float') as any).HALF_FLOAT_OES;
            let supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
            if (isWebGL2) supportLinearFiltering = gl.getExtension('EXT_color_buffer_float');

            return {
                gl,
                ext: {
                    formatRGBA: isWebGL2 ? { internalFormat: gl.RGBA16F, format: gl.RGBA } : { internalFormat: gl.RGBA, format: gl.RGBA },
                    formatRG: isWebGL2 ? { internalFormat: gl.RG16F, format: gl.RG } : { internalFormat: gl.RGBA, format: gl.RGBA },
                    formatR: isWebGL2 ? { internalFormat: gl.R16F, format: gl.RED } : { internalFormat: gl.RGBA, format: gl.RGBA },
                    halfFloat,
                    supportLinearFiltering,
                },
            };
        }

        class Material {
            vertexShader: any;
            fragmentShaderSource: any;
            programs: any;
            activeProgram: any;
            uniforms: any;

            constructor(vertexShader: any, fragmentShaderSource: any) {
                this.vertexShader = vertexShader;
                this.fragmentShaderSource = fragmentShaderSource;
                this.programs = {};
                this.activeProgram = null;
                this.uniforms = {};
            }

            setKeywords(keywords: any) {
                let name = '';
                for (let i = 0; i < keywords.length; i++) name += keywords[i];
                if (this.programs[name] == null) {
                    let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
                    this.programs[name] = new Program(this.vertexShader, fragmentShader);
                }
                this.activeProgram = this.programs[name];
            }

            bind() {
                this.activeProgram?.bind();
            }
        }

        class Program {
            program: any;
            uniforms: any;

            constructor(vertexShader: any, fragmentShader: any) {
                this.uniforms = {};
                this.program = createProgram(vertexShader, fragmentShader);
                const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
                for (let i = 0; i < uniformCount; i++) {
                    const uniformName = gl.getActiveUniform(this.program, i).name;
                    this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
                }
            }

            bind() {
                gl.useProgram(this.program);
            }
        }

        function createProgram(vertexShader: any, fragmentShader: any) {
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw gl.getProgramInfoLog(program);
            return program;
        }

        function compileShader(type: any, source: any, keywords?: any) {
            source = addKeywords(source, keywords);
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(shader);
            return shader;
        }

        function addKeywords(source: any, keywords: any) {
            if (keywords == null) return source;
            let keywordsString = '';
            keywords.forEach((keyword: any) => {
                keywordsString += '#define ' + keyword + '\n';
            });
            return keywordsString + source;
        }

        const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `);

        const blurVertexShader = compileShader(gl.VERTEX_SHADER, `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            float offset = 1.33333333;
            vL = vUv - offset;
            vR = vUv + offset;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `);

        const blurShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        uniform sampler2D uTexture;
        void main () {
            vec4 sum = texture2D(uTexture, vUv) * 0.2270270270;
            sum += texture2D(uTexture, vL) * 0.3162162162;
            sum += texture2D(uTexture, vR) * 0.3162162162;
            gl_FragColor = sum;
        }
    `);

        const copyShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
    `);

        const clearShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `);

        const displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform sampler2D uBloom;
        uniform sampler2D uSunrays;
        uniform sampler2D uDithering;
        uniform vec2 ditherScale;
        uniform vec2 texelSize;

        vec3 linearToGamma (vec3 color) {
            color = max(color, vec3(0));
            return pow(color, vec3(1.0 / 2.2));
        }

        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
        #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;

            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);

            vec3 n = normalize(vec3(dx, dy, 0.1));
            c = c * (dot(n, vec3(0, 0, 1)) * 0.5 + 0.5);
        #endif
        #ifdef BLOOM
            vec3 bloom = texture2D(uBloom, vUv).rgb;
            c += bloom;
        #endif
        #ifdef SUNRAYS
            float sunrays = texture2D(uSunrays, vUv).r;
            c *= sunrays;
            c += sunrays * 0.4;
        #endif

            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `;

        const splatShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspect;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspect;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `);

        const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
        void main () {
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }
    `, ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']);

        const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
    `);

        const curlShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float curl = R - L - T + B;
            gl_FragColor = vec4(0.5 * curl, 0.0, 0.0, 1.0);
        }
    `);

        const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            vec2 vel = texture2D(uVelocity, vUv).xy;
            gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
        }
    `);

        const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    `);

        const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `);

        const blit = (() => {
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(0);

            return (target: any, clear = false) => {
                if (target == null) {
                    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                } else {
                    gl.viewport(0, 0, target.width, target.height);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
                }
                if (clear) {
                    gl.clearColor(0, 0, 0, 1);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            };
        })();

        let dye: any;
        let velocity: any;
        let divergence: any;
        let curl: any;
        let pressure: any;

        const copyProgram = new Program(baseVertexShader, copyShader);
        const clearProgram = new Program(baseVertexShader, clearShader);
        const splatProgram = new Program(baseVertexShader, splatShader);
        const advectionProgram = new Program(baseVertexShader, advectionShader);
        const divergenceProgram = new Program(baseVertexShader, divergenceShader);
        const curlProgram = new Program(baseVertexShader, curlShader);
        const vorticityProgram = new Program(baseVertexShader, vorticityShader);
        const pressureProgram = new Program(baseVertexShader, pressureShader);
        const gradSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
        const displayMaterial = new Material(baseVertexShader, displayShaderSource);

        function initFramebuffers() {
            let simRes = getResolution(config.SIM_RESOLUTION);
            let dyeRes = getResolution(config.DYE_RESOLUTION);

            const texType = ext.halfFloat;
            const rgba = ext.formatRGBA;
            const rg = ext.formatRG;
            const r = ext.formatR;
            const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

            gl.disable(gl.BLEND);

            dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
            velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
            divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
            curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
            pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        }

        function getResolution(resolution: number) {
            let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
            if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

            let min = resolution;
            let max = Math.round(resolution * aspectRatio);

            if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
            else return { width: min, height: max };
        }

        function createFBO(w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
            gl.activeTexture(gl.TEXTURE0);
            let texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

            let fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT);

            let texelSizeX = 1.0 / w;
            let texelSizeY = 1.0 / h;

            return {
                texture,
                fbo,
                width: w,
                height: h,
                texelSizeX,
                texelSizeY,
                attach(id: number) {
                    gl.activeTexture(gl.TEXTURE0 + id);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    return id;
                },
            };
        }

        function createDoubleFBO(w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
            let fbo1 = createFBO(w, h, internalFormat, format, type, param);
            let fbo2 = createFBO(w, h, internalFormat, format, type, param);

            return {
                width: w,
                height: h,
                texelSizeX: fbo1.texelSizeX,
                texelSizeY: fbo1.texelSizeY,
                get read() {
                    return fbo1;
                },
                set read(value) {
                    fbo1 = value;
                },
                get write() {
                    return fbo2;
                },
                set write(value) {
                    fbo2 = value;
                },
                swap() {
                    let temp = fbo1;
                    fbo1 = fbo2;
                    fbo2 = temp;
                },
            };
        }

        function update() {
            const dt = 1 / 60;
            if (resizeCanvas()) initFramebuffers();
            applyInputs();
            step(dt);
            render(null);
            requestAnimationFrame(update);
        }

        function resizeCanvas() {
            let width = canvas!.clientWidth;
            let height = canvas!.clientHeight;
            if (canvas!.width !== width || canvas!.height !== height) {
                canvas!.width = width;
                canvas!.height = height;
                return true;
            }
            return false;
        }

        function applyInputs() {
            if (splatStack.length > 0) {
                const s = splatStack.pop();
                splat(s.x, s.y, s.dx, s.dy, s.color);
            }

            pointers.forEach((p) => {
                if (p.moved) {
                    p.moved = false;
                    splatPointer(p);
                }
            });
        }

        function splatPointer(p: any) {
            let dx = p.deltaX * config.SPLAT_FORCE;
            let dy = p.deltaY * config.SPLAT_FORCE;
            splat(p.x, p.y, dx, dy, p.color);
        }

        function splat(x: number, y: number, dx: number, dy: number, color: any) {
            splatProgram.bind();
            gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
            gl.uniform1f(splatProgram.uniforms.aspect, canvas!.width / canvas!.height);
            gl.uniform2f(splatProgram.uniforms.point, x, y);
            gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
            gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
            blit(velocity.write);
            velocity.swap();

            gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
            gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
            blit(dye.write);
            dye.swap();
        }

        function multipleSplats(amount: number) {
            for (let i = 0; i < amount; i++) {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const x = Math.random();
                const y = Math.random();
                const dx = 100 * (Math.random() - 0.5);
                const dy = 100 * (Math.random() - 0.5);
                splat(x, y, dx, dy, color);
            }
        }

        function step(dt: number) {
            gl.disable(gl.BLEND);

            curlProgram.bind();
            gl.uniform2f(curlProgram.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
            gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
            blit(curl);

            vorticityProgram.bind();
            gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
            gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
            gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
            gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
            gl.uniform1f(vorticityProgram.uniforms.dt, dt);
            blit(velocity.write);
            velocity.swap();

            divergenceProgram.bind();
            gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
            gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
            blit(divergence);

            clearProgram.bind();
            gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
            gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
            blit(pressure.write);
            pressure.swap();

            pressureProgram.bind();
            gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
            gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
            for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
                gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
                blit(pressure.write);
                pressure.swap();
            }

            gradSubtractProgram.bind();
            gl.uniform2f(gradSubtractProgram.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
            gl.uniform1i(gradSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
            gl.uniform1i(gradSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
            blit(velocity.write);
            velocity.swap();

            advectionProgram.bind();
            gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
            if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.read.texelSizeX, velocity.read.texelSizeY);
            let velocityId = velocity.read.attach(0);
            gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
            gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
            gl.uniform1f(advectionProgram.uniforms.dt, dt);
            gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
            blit(velocity.write);
            velocity.swap();

            if (!ext.supportLinearFiltering) gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.read.texelSizeX, dye.read.texelSizeY);
            gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
            gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
            gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
            blit(dye.write);
            dye.swap();
        }

        function render(target: any) {
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);

            const keywords: string[] = [];
            if (config.SHADING) keywords.push('SHADING');
            displayMaterial.setKeywords(keywords);
            displayMaterial.bind();
            gl.uniform2f(displayMaterial.activeProgram.uniforms.texelSize, 1.0 / canvas!.width, 1.0 / canvas!.height);
            gl.uniform1i(displayMaterial.activeProgram.uniforms.uTexture, dye.read.attach(0));
            blit(target);
        }

        // Input handling
        function updatePointerMoveData(pointer: any, posX: number, posY: number) {
            let dx = (posX - pointer.prevRawX);
            let dy = (posY - pointer.prevRawY);
            pointer.deltaX = dx * 0.01;
            pointer.deltaY = dy * 0.01;
            pointer.prevRawX = posX;
            pointer.prevRawY = posY;
            pointer.x = posX / canvas!.width;
            pointer.y = 1.0 - posY / canvas!.height;
            // Shift color slightly for iridescent feel
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                pointer.color = colors[Math.floor(Math.random() * colors.length)];
            }
            pointer.moved = true;
        }

        function onMouseMove(e: MouseEvent) {
            if (pointers.length === 0) {
                pointers.push({
                    id: -1,
                    x: 0,
                    y: 0,
                    prevRawX: 0,
                    prevRawY: 0,
                    deltaX: 0,
                    deltaY: 0,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    moved: false,
                });
            }
            updatePointerMoveData(pointers[0], e.clientX, e.clientY);
        }

        function onTouchMove(e: TouchEvent) {
            e.preventDefault();
            const touches = e.targetTouches;
            for (let i = 0; i < touches.length; i++) {
                let pointer = pointers.find((p) => p.id === touches[i].identifier);
                if (!pointer) continue;
                const rect = canvas!.getBoundingClientRect();
                updatePointerMoveData(pointer, touches[i].clientX - rect.left, touches[i].clientY - rect.top);
            }
        }

        function onMouseDown(e: MouseEvent) {
            pointers.push({
                id: -1,
                x: e.clientX / canvas!.width,
                y: 1.0 - e.clientY / canvas!.height,
                prevRawX: e.clientX,
                prevRawY: e.clientY,
                deltaX: 0,
                deltaY: 0,
                color: colors[Math.floor(Math.random() * colors.length)],
                moved: true,
            });
        }

        function onTouchStart(e: TouchEvent) {
            e.preventDefault();
            const touches = e.targetTouches;
            for (let i = 0; i < touches.length; i++) {
                const rect = canvas!.getBoundingClientRect();
                pointers.push({
                    id: touches[i].identifier,
                    x: (touches[i].clientX - rect.left) / canvas!.width,
                    y: 1.0 - (touches[i].clientY - rect.top) / canvas!.height,
                    prevRawX: touches[i].clientX - rect.left,
                    prevRawY: touches[i].clientY - rect.top,
                    deltaX: 0,
                    deltaY: 0,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    moved: true,
                });
            }
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('touchstart', onTouchStart);
        window.addEventListener('touchmove', onTouchMove);

        resizeCanvas();
        initFramebuffers();
        multipleSplats(5);
        update();

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 h-full w-full pointer-events-none ${className}`}
            style={{ zIndex: 0 }}
        />
    );
};

export default FluidBackground;
