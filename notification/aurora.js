// Aurora Effect for Google Meet Reminder
// Adapted from React component to vanilla JavaScript

class Aurora {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      colorStops: options.colorStops || ["#3A29FF", "#FF94B4", "#FF3232"],
      amplitude: options.amplitude || 1.0,
      blend: options.blend || 0.5,
      speed: options.speed || 0.5
    };
    
    this.animationId = null;
    this.init();
  }
  
  init() {
    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '-1';
    this.container.appendChild(this.canvas);
    
    // Initialize WebGL
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
    
    if (!this.gl) {
      console.error('WebGL2 not supported');
      return;
    }
    
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    
    // Create shaders
    this.createShaders();
    
    // Create geometry (a simple triangle that covers the screen)
    this.createGeometry();
    
    // Set up uniforms
    this.setupUniforms();
    
    // Handle resize
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    
    // Start animation
    this.animate(0);
  }
  
  createShaders() {
    const vertexShaderSource = `#version 300 es
      in vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const fragmentShaderSource = `#version 300 es
      precision highp float;

      uniform float uTime;
      uniform float uAmplitude;
      uniform vec3 uColorStops[3];
      uniform vec2 uResolution;
      uniform float uBlend;

      out vec4 fragColor;

      vec3 permute(vec3 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
      }

      float snoise(vec2 v){
        const vec4 C = vec4(
            0.211324865405187, 0.366025403784439,
            -0.577350269189626, 0.024390243902439
        );
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);

        vec3 p = permute(
            permute(i.y + vec3(0.0, i1.y, 1.0))
          + i.x + vec3(0.0, i1.x, 1.0)
        );

        vec3 m = max(
            0.5 - vec3(
                dot(x0, x0),
                dot(x12.xy, x12.xy),
                dot(x12.zw, x12.zw)
            ), 
            0.0
        );
        m = m * m;
        m = m * m;

        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      struct ColorStop {
        vec3 color;
        float position;
      };

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        
        ColorStop colors[3];
        colors[0] = ColorStop(uColorStops[0], 0.0);
        colors[1] = ColorStop(uColorStops[1], 0.5);
        colors[2] = ColorStop(uColorStops[2], 1.0);
        
        vec3 rampColor;
        
        // Color ramp implementation
        int index = 0;
        for (int i = 0; i < 2; i++) {
          ColorStop currentColor = colors[i];
          bool isInBetween = currentColor.position <= uv.x;
          index = int(mix(float(index), float(i), float(isInBetween)));
        }
        
        ColorStop currentColor = colors[index];
        ColorStop nextColor = colors[index + 1];
        float range = nextColor.position - currentColor.position;
        float lerpFactor = (uv.x - currentColor.position) / range;
        rampColor = mix(currentColor.color, nextColor.color, lerpFactor);
        
        float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
        height = exp(height);
        height = (uv.y * 2.0 - height + 0.2);
        float intensity = 0.6 * height;
        
        // midPoint is fixed; uBlend controls the transition width.
        float midPoint = 0.20;
        float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
        
        vec3 auroraColor = intensity * rampColor;
        
        // Premultiplied alpha output.
        fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
      }
    `;
    
    // Create vertex shader
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, vertexShaderSource);
    this.gl.compileShader(vertexShader);
    
    if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation failed:', this.gl.getShaderInfoLog(vertexShader));
      return;
    }
    
    // Create fragment shader
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, fragmentShaderSource);
    this.gl.compileShader(fragmentShader);
    
    if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation failed:', this.gl.getShaderInfoLog(fragmentShader));
      return;
    }
    
    // Create program
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program linking failed:', this.gl.getProgramInfoLog(this.program));
      return;
    }
    
    this.gl.useProgram(this.program);
  }
  
  createGeometry() {
    // Create a triangle that covers the screen
    const vertices = new Float32Array([
      -1.0, -1.0,
       3.0, -1.0,
      -1.0,  3.0
    ]);
    
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    const positionLocation = this.gl.getAttribLocation(this.program, 'position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
  }
  
  setupUniforms() {
    // Get uniform locations
    this.uniforms = {
      uTime: this.gl.getUniformLocation(this.program, 'uTime'),
      uAmplitude: this.gl.getUniformLocation(this.program, 'uAmplitude'),
      uColorStops: this.gl.getUniformLocation(this.program, 'uColorStops'),
      uResolution: this.gl.getUniformLocation(this.program, 'uResolution'),
      uBlend: this.gl.getUniformLocation(this.program, 'uBlend')
    };
    
    // Set initial uniform values
    this.gl.uniform1f(this.uniforms.uAmplitude, this.options.amplitude);
    this.gl.uniform1f(this.uniforms.uBlend, this.options.blend);
    
    // Convert color stops from hex to RGB
    const colorStopsArray = this.options.colorStops.map(hex => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return [r, g, b];
    }).flat();
    
    this.gl.uniform3fv(this.uniforms.uColorStops, new Float32Array(colorStopsArray));
  }
  
  resize() {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.gl.viewport(0, 0, width, height);
    this.gl.uniform2f(this.uniforms.uResolution, width, height);
  }
  
  animate(time) {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    // Update time uniform
    const scaledTime = time * 0.001 * this.options.speed;
    this.gl.uniform1f(this.uniforms.uTime, scaledTime);
    
    // Draw
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.resize);
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    if (this.gl) {
      // Clean up WebGL resources
      this.gl.deleteBuffer(this.vertexBuffer);
      this.gl.deleteProgram(this.program);
      
      // Lose context
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  }
}

// Export the Aurora class
window.Aurora = Aurora;