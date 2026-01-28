declare module 'three/examples/jsm/objects/GroundProjectedSkybox' {
  import * as THREE from 'three';

  export class GroundProjectedSkybox extends THREE.Mesh {
    constructor(envMap: THREE.Texture);
    radius: number;
    height: number;
  }
}

declare module 'three/examples/jsm/objects/GroundProjectedSkybox.js' {
  export * from 'three/examples/jsm/objects/GroundProjectedSkybox';
}

declare module 'three/addons/objects/GroundProjectedSkybox.js' {
  import * as THREE from 'three';

  export class GroundProjectedSkybox extends THREE.Mesh {
    constructor(envMap: THREE.Texture);
    radius: number;
    height: number;
  }
}
