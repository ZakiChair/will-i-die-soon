import * as THREE from "three";

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = viewPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

/** Les deux surfaces partagent la même horloge que les articulations et la pause. */
export function createHumanEnergyMaterials(): {
  surface: THREE.ShaderMaterial;
  glow: THREE.ShaderMaterial;
} {
  const surface = new THREE.ShaderMaterial({
    name: "human-energy-surface",
    uniforms: { uTime: { value: 0 } },
    vertexShader,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        float facing = abs(dot(normal, normalize(-vViewPosition)));
        float rim = pow(1.0 - facing, 2.0);
        float light = 0.48 + 0.52 * max(0.0, dot(normal, normalize(vec3(-0.4, 0.7, 0.6))));
        float wave = sin(vWorldPosition.y * 9.0 + sin(vWorldPosition.x * 4.0 + uTime * 0.65) - uTime * 1.2);
        float energy = smoothstep(0.965, 1.0, wave) * 0.13;
        float breath = 0.97 + 0.03 * sin(uTime * 1.1);
        vec3 blue = mix(vec3(0.009, 0.075, 0.25), vec3(0.015, 0.28, 0.62), light);
        vec3 color = mix(blue * breath, vec3(0.008, 0.105, 0.29), rim * 0.78);
        color += vec3(0.04, 0.30, 0.55) * energy;
        gl_FragColor = vec4(color, mix(0.83, 0.96, rim));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });

  const glow = new THREE.ShaderMaterial({
    name: "human-energy-aura",
    uniforms: { uTime: { value: 0 } },
    vertexShader,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        float facing = abs(dot(normalize(vNormal), normalize(-vViewPosition)));
        float edge = pow(1.0 - facing, 2.7);
        float pulse = 0.94 + 0.06 * sin(uTime * 1.1);
        gl_FragColor = vec4(0.01, 0.20, 0.46, edge * 0.16 * pulse);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
  return { surface, glow };
}
