export function GlassDistortionFilter() {
  return (
    <svg aria-hidden="true" className="glass-filter">
      <filter
        id="glass-distortion"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
        filterUnits="objectBoundingBox"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence type="fractalNoise" baseFrequency="0.009 0.012" numOctaves={1} seed={5} result="turbulence" />
        <feGaussianBlur in="turbulence" stdDeviation={5} result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale={5}
          specularConstant={1}
          specularExponent={100}
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x={-200} y={-200} z={300} />
        </feSpecularLighting>
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale={92}
          xChannelSelector="R"
          yChannelSelector="G"
          result="displacedRough"
        />
        <feColorMatrix
          in="displacedRough"
          type="matrix"
          values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
          result="displacedR"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale={86}
          xChannelSelector="R"
          yChannelSelector="G"
          result="displacedMid"
        />
        <feColorMatrix
          in="displacedMid"
          type="matrix"
          values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
          result="displacedG"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale={80}
          xChannelSelector="R"
          yChannelSelector="G"
          result="displacedSoft"
        />
        <feColorMatrix
          in="displacedSoft"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
          result="displacedB"
        />
        <feBlend in="displacedR" in2="displacedG" mode="screen" result="blend1" />
        <feBlend in="blend1" in2="displacedB" mode="screen" />
      </filter>
    </svg>
  );
}
