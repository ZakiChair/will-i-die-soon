import * as THREE from "three";

/** Une seule surface légère : les contours portent la forme, le centre laisse voir le fond. */
export function createHumanTranslucentMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    name: "human-frosted-surface",
    uniforms: {
      uTint: { value: new THREE.Color("#619b90") },
      uOpacity: { value: 0.78 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewPosition = viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uTint;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 view = normalize(-vViewPosition);
        float facing = max(0.0, dot(normal, view));
        float rim = pow(1.0 - facing, 1.35);
        vec3 light = normalize(vec3(-0.55, 0.8, 0.65));
        float diffuse = max(0.0, dot(normal, light));
        float sheen = pow(max(0.0, dot(normal, normalize(light + view))), 24.0);
        vec3 pearl = mix(uTint, vec3(0.9, 0.98, 0.95), 0.18 + diffuse * 0.30);
        vec3 color = mix(pearl, uTint * 0.62, rim * 0.78);
        color = mix(color, vec3(1.0), sheen * 0.5);
        gl_FragColor = vec4(color, uOpacity * (0.40 + rim * 0.56 + sheen * 0.04));
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
}
