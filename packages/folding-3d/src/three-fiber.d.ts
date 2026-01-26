/// <reference types="@react-three/fiber" />

import '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      shadowMaterial: any;
      ambientLight: any;
      directionalLight: any;
      hemisphereLight: any;
      color: any;
    }
  }
}
