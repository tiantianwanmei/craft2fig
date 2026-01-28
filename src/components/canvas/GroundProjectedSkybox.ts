import * as THREE from 'three';

type GroundProjectedSkyboxOptions = {
  height?: number;
  radius?: number;
};

export class GroundProjectedSkybox extends THREE.Mesh {
  public constructor(texture: THREE.Texture, options: GroundProjectedSkyboxOptions = {}) {
    const isCubeMap = (texture as any).isCubeTexture;

    const defines: string[] = [isCubeMap ? '#define ENVMAP_TYPE_CUBE' : ''];

    const vertexShader = `
			varying vec3 vWorldPosition;

			void main() {

				vec4 worldPosition = ( modelMatrix * vec4( position, 1.0 ) );
				vWorldPosition = worldPosition.xyz;

				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			}
			`;

    const fragmentShader = `${defines.join('\n')}

			varying vec3 vWorldPosition;

			uniform float radius;
			uniform float height;
			uniform float angle;
			uniform vec3 center;
			uniform vec3 virtualCameraPosition;

			#ifdef ENVMAP_TYPE_CUBE

				uniform samplerCube map;

			#else

				uniform sampler2D map;

			#endif

			float diskIntersectWithBackFaceCulling( vec3 ro, vec3 rd, vec3 c, vec3 n, float r )
			{

				float d = dot ( rd, n );

				if( d > 0.0 ) { return 1e6; }

				vec3 o = ro - c;
				float t = - dot( n, o ) / d;
				vec3 q = o + rd * t;

				return ( dot( q, q ) < r * r ) ? t : 1e6;

			}

			float sphereIntersect( vec3 ro, vec3 rd, vec3 ce, float ra ) {

				vec3 oc = ro - ce;
				float b = dot( oc, rd );
				float c = dot( oc, oc ) - ra * ra;
				float h = b * b - c;

				if( h < 0.0 ) { return -1.0; }

				h = sqrt( h );

				return - b + h;

			}

			vec3 project() {

				vec3 p = normalize( vWorldPosition - center );
				vec3 camPos = virtualCameraPosition - center;
				camPos.y -= height;

				float intersection = sphereIntersect( camPos, p, vec3( 0.0 ), radius );
				if( intersection > 0.0 ) {

					vec3 h = vec3( 0.0, - height, 0.0 );
					float intersection2 = diskIntersectWithBackFaceCulling( camPos, p, h, vec3( 0.0, 1.0, 0.0 ), radius );
					p = ( camPos + min( intersection, intersection2 ) * p ) / radius;

				} else {

					p = vec3( 0.0, 1.0, 0.0 );

				}

				return p;

			}

			#include <common>

			void main() {

				vec3 projectedWorldPosition = project();

				#ifdef ENVMAP_TYPE_CUBE

					vec3 outcolor = textureCube( map, projectedWorldPosition ).rgb;

				#else

					vec3 direction = normalize( projectedWorldPosition );
					vec2 uv = equirectUv( direction );
					vec3 outcolor = texture2D( map, uv ).rgb;

				#endif

				gl_FragColor = vec4( outcolor, 1.0 );

				#include <tonemapping_fragment>
				#include <colorspace_fragment>

			}
			`;

    const uniforms = {
      map: { value: texture },
      height: { value: options.height ?? 15 },
      radius: { value: options.radius ?? 100 },
      angle: { value: 0 },
      center: { value: new THREE.Vector3(0, 0, 0) },
      virtualCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
    };

    const geometry = new THREE.IcosahedronGeometry(1, 16);
    const material = new THREE.ShaderMaterial({
      uniforms,
      fragmentShader,
      vertexShader,
      side: THREE.DoubleSide,
    });

    super(geometry, material);
  }

  public set radius(value: number) {
    (this.material as THREE.ShaderMaterial).uniforms.radius.value = value;
  }

  public get radius(): number {
    return (this.material as THREE.ShaderMaterial).uniforms.radius.value as number;
  }

  public set height(value: number) {
    (this.material as THREE.ShaderMaterial).uniforms.height.value = value;
  }

  public get height(): number {
    return (this.material as THREE.ShaderMaterial).uniforms.height.value as number;
  }

  public set center(value: THREE.Vector3) {
    const u = (this.material as THREE.ShaderMaterial).uniforms.center;
    (u.value as THREE.Vector3).copy(value);
  }

  public get center(): THREE.Vector3 {
    return (this.material as THREE.ShaderMaterial).uniforms.center.value as THREE.Vector3;
  }

  public set virtualCameraPosition(value: THREE.Vector3) {
    const u = (this.material as THREE.ShaderMaterial).uniforms.virtualCameraPosition;
    (u.value as THREE.Vector3).copy(value);
  }

  public get virtualCameraPosition(): THREE.Vector3 {
    return (this.material as THREE.ShaderMaterial).uniforms.virtualCameraPosition.value as THREE.Vector3;
  }
}
