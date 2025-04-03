// Orb Effect for Google Meet Reminder
// Adapted from React component to vanilla JavaScript

class Orb {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      hue: options.hue || 0,
      hoverIntensity: options.hoverIntensity || 0.1,
      rotateOnHover: options.rotateOnHover !== undefined ? options.rotateOnHover : true,
      forceHoverState: options.forceHoverState || false
    };
    
    this.animationId = null;
    this.targetHover = 0;
    this.lastTime = 0;
    this.currentRot = 0;
    this.rotationSpeed = 0.3; // radians per second
    
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
    this.container.appendChild(this.canvas);
    
    // Initialize WebGL
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false
    });
    
    if (!this.gl) {
      console.error('WebGL2 not supported');
      return;
    }
    
    this.gl.clearColor(0, 0, 0, 0);
    
    // Create shaders
    this.createShaders();
    
    // Create geometry (a simple triangle that covers the screen)
    this.createGeometry();
    
    // Set up uniforms
    this.setupUniforms();
    
    // Handle resize
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    
    // Handle mouse events
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    // Start animation
    this.animate(0);
  }
  
  createShaders() {
    const vertexShaderSource = `
      precision highp float;
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    
    const fragmentShaderSource = `
      precision highp float;

      uniform float iTime;
      uniform vec3 iResolution;
      uniform float hue;
      uniform float hover;
      uniform float rot;
      uniform float hoverIntensity;
      varying vec2 vUv;

      vec3 rgb2yiq(vec3 c) {
        float y = dot(c, vec3(0.299, 0.587, 0.114));
        float i = dot(c, vec3(0.596, -0.274, -0.322));
        float q = dot(c, vec3(0.211, -0.523, 0.312));
        return vec3(y, i, q);
      }
      
      vec3 yiq2rgb(vec3 c) {
        float r = c.x + 0.956 * c.y + 0.621 * c.z;
        float g = c.x - 0.272 * c.y - 0.647 * c.z;
        float b = c.x - 1.106 * c.y + 1.703 * c.z;
        return vec3(r, g, b);
      }
      
      vec3 adjustHue(vec3 color, float hueDeg) {
        float hueRad = hueDeg * 3.14159265 / 180.0;
        vec3 yiq = rgb2yiq(color);
        float cosA = cos(hueRad);
        float sinA = sin(hueRad);
        float i = yiq.y * cosA - yiq.z * sinA;
        float q = yiq.y * sinA + yiq.z * cosA;
        yiq.y = i;
        yiq.z = q;
        return yiq2rgb(yiq);
      }

      vec3 hash33(vec3 p3) {
        p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
        p3 += dot(p3, p3.yxz + 19.19);
        return -1.0 + 2.0 * fract(vec3(
          p3.x + p3.y,
          p3.x + p3.z,
          p3.y + p3.z
        ) * p3.zyx);
      }

      float snoise3(vec3 p) {
        const float K1 = 0.333333333;
        const float K2 = 0.166666667;
        vec3 i = floor(p + (p.x + p.y + p.z) * K1);
        vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
        vec3 e = step(vec3(0.0), d0 - d0.yzx);
        vec3 i1 = e * (1.0 - e.zxy);
        vec3 i2 = 1.0 - e.zxy * (1.0 - e);
        vec3 d1 = d0 - (i1 - K2);
        vec3 d2 = d0 - (i2 - K1);
        vec3 d3 = d0 - 0.5;
        vec4 h = max(0.6 - vec4(
          dot(d0, d0),
          dot(d1, d1),
          dot(d2, d2),
          dot(d3, d3)
        ), 0.0);
        vec4 n = h * h * h * h * vec4(
          dot(d0, hash33(i)),
          dot(d1, hash33(i + i1)),
          dot(d2, hash33(i + i2)),
          dot(d3, hash33(i + 1.0))
        );
        return dot(vec4(31.316), n);
      }

      // Instead of "extractAlpha" that normalizes the color,
      // we keep the computed color as-is and later multiply by alpha.
      vec4 extractAlpha(vec3 colorIn) {
        float a = max(max(colorIn.r, colorIn.g), colorIn.b);
        return vec4(colorIn.rgb / (a + 1e-5), a);
      }

      const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
      const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
      const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
      const float innerRadius = 0.6;
      const float noiseScale = 0.65;

      float light1(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * attenuation);
      }
      float light2(float intensity, float attenuation, float dist) {
        return intensity / (1.0 + dist * dist * attenuation);
      }

      vec4 draw(vec2 uv) {
        vec3 color1 = adjustHue(baseColor1, hue);
        vec3 color2 = adjustHue(baseColor2, hue);
        vec3 color3 = adjustHue(baseColor3, hue);
        
        float ang = atan(uv.y, uv.x);
        float len = length(uv);
        float invLen = len > 0.0 ? 1.0 / len : 0.0;
        
        float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
        float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
        float d0 = distance(uv, (r0 * invLen) * uv);
        float v0 = light1(1.0, 10.0, d0);
        v0 *= smoothstep(r0 * 1.05, r0, len);
        float cl = cos(ang + iTime * 2.0) * 0.5 + 0.5;
        
        float a = iTime * -1.0;
        vec2 pos = vec2(cos(a), sin(a)) * r0;
        float d = distance(uv, pos);
        float v1 = light2(1.5, 5.0, d);
        v1 *= light1(1.0, 50.0, d0);
        
        float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
        float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
        
        vec3 col = mix(color1, color2, cl);
        col = mix(color3, col, v0);
        col = (col + v1) * v2 * v3;
        col = clamp(col, 0.0, 1.0);
        
        return extractAlpha(col);
      }

      vec4 mainImage(vec2 fragCoord) {
        vec2 center = iResolution.xy * 0.5;
        float size = min(iResolution.x, iResolution.y);
        vec2 uv = (fragCoord - center) / size * 2.0;
        
        float angle = rot;
        float s = sin(angle);
        float c = cos(angle);
        uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
        
        uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 1.0 + iTime);
        uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 1.0 + iTime);
        
        return draw(uv);
      }

      void main() {
        vec2 fragCoord = vUv * iResolution.xy;
        vec4 col = mainImage(fragCoord);
        gl_FragColor = vec4(col.rgb * col.a, col.a);
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
    
    const uvs = new Float32Array([
      0.0, 0.0,
      2.0, 0.0,
      0.0, 2.0
    ]);
    
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    const positionLocation = this.gl.getAttribLocation(this.program, 'position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    
    this.uvBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.uvBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, uvs, this.gl.STATIC_DRAW);
    
    const uvLocation = this.gl.getAttribLocation(this.program, 'uv');
    this.gl.enableVertexAttribArray(uvLocation);
    this.gl.vertexAttribPointer(uvLocation, 2, this.gl.FLOAT, false, 0, 0);
  }
  
  setupUniforms() {
    // Get uniform locations
    this.uniforms = {
      iTime: this.gl.getUniformLocation(this.program, 'iTime'),
      iResolution: this.gl.getUniformLocation(this.program, 'iResolution'),
      hue: this.gl.getUniformLocation(this.program, 'hue'),
      hover: this.gl.getUniformLocation(this.program, 'hover'),
      rot: this.gl.getUniformLocation(this.program, 'rot'),
      hoverIntensity: this.gl.getUniformLocation(this.program, 'hoverIntensity')
    };
    
    // Set initial uniform values
    this.gl.uniform1f(this.uniforms.hue, this.options.hue);
    this.gl.uniform1f(this.uniforms.hover, 0);
    this.gl.uniform1f(this.uniforms.rot, 0);
    this.gl.uniform1f(this.uniforms.hoverIntensity, this.options.hoverIntensity);
  }
  
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.uniform3f(
      this.uniforms.iResolution,
      this.canvas.width,
      this.canvas.height,
      this.canvas.width / this.canvas.height
    );
  }
  
  handleMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const uvX = ((x - centerX) / size) * 2.0;
    const uvY = ((y - centerY) / size) * 2.0;
    
    if (Math.sqrt(uvX * uvX + uvY * uvY) < 0.8) {
      this.targetHover = 1;
    } else {
      this.targetHover = 0;
    }
  }
  
  handleMouseLeave() {
    this.targetHover = 0;
  }
  
  animate(time) {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    const dt = (time - this.lastTime) * 0.001;
    this.lastTime = time;
    
    // Update uniforms
    this.gl.uniform1f(this.uniforms.iTime, time * 0.001);
    this.gl.uniform1f(this.uniforms.hue, this.options.hue);
    this.gl.uniform1f(this.uniforms.hoverIntensity, this.options.hoverIntensity);
    
    const effectiveHover = this.options.forceHoverState ? 1 : this.targetHover;
    const currentHover = this.gl.getUniform(this.program, this.uniforms.hover);
    const newHover = currentHover + (effectiveHover - currentHover) * 0.1;
    this.gl.uniform1f(this.uniforms.hover, newHover);
    
    if (this.options.rotateOnHover && effectiveHover > 0.5) {
      this.currentRot += dt * this.rotationSpeed;
    }
    this.gl.uniform1f(this.uniforms.rot, this.currentRot);
    
    // Draw
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.resize);
    this.container.removeEventListener('mousemove', this.handleMouseMove);
    this.container.removeEventListener('mouseleave', this.handleMouseLeave);
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    if (this.gl) {
      // Clean up WebGL resources
      this.gl.deleteBuffer(this.vertexBuffer);
      this.gl.deleteBuffer(this.uvBuffer);
      this.gl.deleteProgram(this.program);
      
      // Lose context
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  }
}

// Export the Orb class
window.Orb = Orb;