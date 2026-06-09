import { Canvas, useFrame } from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  Stars,
  useTexture,
  Trail,
} from "@react-three/drei";
import {
  Activity,
  AlertTriangle,
  Bell,
  Crosshair,
  Gauge,
  Globe2,
  Layers3,
  Radar,
  Rocket,
  Satellite,
  Search,
  ShieldAlert,
  Timer,
  Zap,
} from "lucide-react";
import PlotComponent from "react-plotly.js";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const Plot = PlotComponent.default ?? PlotComponent;

const EARTH_TEXTURE =
  "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg";
const CLOUD_TEXTURE =
  "https://threejs.org/examples/textures/planets/earth_clouds_1024.png";

const trackedObjects = [
  {
    name: "ISS (ZARYA)",
    noradId: "25544",
    type: "satellite",
    operator: "NASA / Roscosmos",
    altitudeKm: 419,
    speedKmh: 27600,
    inclination: 51.6,
    orbitRadius: 2.45,
    eccentricity: 0.01,
    phase: 0.2,
    speed: 0.62,
    risk: "High",
    closestApproachKm: 1.8,
    collisionProbability: 0.0062,
    latitude: 33.12,
    longitude: -114.81,
  },
  {
    name: "Starlink-30142",
    noradId: "59123",
    type: "satellite",
    operator: "SpaceX",
    altitudeKm: 552,
    speedKmh: 27080,
    inclination: 53.2,
    orbitRadius: 2.72,
    eccentricity: 0.006,
    phase: 1.4,
    speed: 0.52,
    risk: "Medium",
    closestApproachKm: 4.7,
    collisionProbability: 0.0017,
    latitude: -18.75,
    longitude: 84.26,
  },
  {
    name: "Hubble Space Telescope",
    noradId: "20580",
    type: "satellite",
    operator: "NASA / ESA",
    altitudeKm: 535,
    speedKmh: 27300,
    inclination: 28.5,
    orbitRadius: 2.63,
    eccentricity: 0.004,
    phase: 2.35,
    speed: 0.49,
    risk: "Low",
    closestApproachKm: 14.2,
    collisionProbability: 0.0002,
    latitude: 4.48,
    longitude: -21.44,
  },
  {
    name: "NOAA-20",
    noradId: "43013",
    type: "satellite",
    operator: "NOAA",
    altitudeKm: 824,
    speedKmh: 26650,
    inclination: 98.7,
    orbitRadius: 3.08,
    eccentricity: 0.01,
    phase: 4.4,
    speed: 0.41,
    risk: "Medium",
    closestApproachKm: 6.1,
    collisionProbability: 0.0012,
    latitude: 76.36,
    longitude: 36.82,
  },
  {
    name: "GPS BIIR-2",
    noradId: "24876",
    type: "satellite",
    operator: "US Space Force",
    altitudeKm: 20200,
    speedKmh: 14000,
    inclination: 55,
    orbitRadius: 5.65,
    eccentricity: 0.02,
    phase: 5.2,
    speed: 0.18,
    risk: "Low",
    closestApproachKm: 38.4,
    collisionProbability: 0.00005,
    latitude: 51.02,
    longitude: -72.09,
  },
  {
    name: "Fengyun-1C Debris",
    noradId: "30671",
    type: "debris",
    operator: "Fragment cloud",
    altitudeKm: 865,
    speedKmh: 26500,
    inclination: 98.8,
    orbitRadius: 3.22,
    eccentricity: 0.03,
    phase: 3.05,
    speed: 0.43,
    risk: "Critical",
    closestApproachKm: 0.72,
    collisionProbability: 0.018,
    latitude: -64.55,
    longitude: 129.18,
  },
  {
    name: "Cosmos 2251 Fragment",
    noradId: "33757",
    type: "debris",
    operator: "Iridium-Cosmos event",
    altitudeKm: 790,
    speedKmh: 26870,
    inclination: 74.0,
    orbitRadius: 3.0,
    eccentricity: 0.04,
    phase: 0.95,
    speed: 0.46,
    risk: "High",
    closestApproachKm: 1.2,
    collisionProbability: 0.0094,
    latitude: 48.75,
    longitude: 151.4,
  },
  {
    name: "CZ-2D Rocket Body",
    noradId: "48274",
    type: "debris",
    operator: "Rocket body",
    altitudeKm: 625,
    speedKmh: 27110,
    inclination: 97.6,
    orbitRadius: 2.86,
    eccentricity: 0.05,
    phase: 5.8,
    speed: 0.48,
    risk: "Medium",
    closestApproachKm: 5.5,
    collisionProbability: 0.0021,
    latitude: -22.1,
    longitude: -4.66,
  },
];

const riskPalette = {
  Low: "#36f7a5",
  Medium: "#ffd166",
  High: "#ff8a3d",
  Critical: "#ff3f71",
};

const alertFeed = [
  {
    title: "ISS conjunction watch",
    body: "Fengyun-1C fragment projected within 1.8 km corridor.",
    eta: "T+43m",
    risk: "High",
  },
  {
    title: "Critical debris density band",
    body: "865 km sun-synchronous shell exceeds baseline density by 21%.",
    eta: "Live",
    risk: "Critical",
  },
  {
    title: "Starlink plane 53.2 review",
    body: "Three medium-risk passes within the next 24 hours.",
    eta: "T+6h",
    risk: "Medium",
  },
  {
    title: "GPS corridor stable",
    body: "No high-probability conjunction in MEO prediction volume.",
    eta: "7d",
    risk: "Low",
  },
];

const predictionWindows = [
  { label: "1 hour", events: 4, probability: "0.62%", corridor: "LEO 51.6 deg" },
  { label: "6 hours", events: 9, probability: "1.81%", corridor: "LEO polar" },
  { label: "24 hours", events: 17, probability: "2.44%", corridor: "SSO 865 km" },
  { label: "7 days", events: 42, probability: "4.92%", corridor: "LEO + MEO" },
];

function makeOrbitPoints(
  radius,
  inclinationDeg,
  eccentricity = 0,
  phase = 0,
  samples = 256,
) {
  const points = [];
  const inclination = THREE.MathUtils.degToRad(inclinationDeg);

  for (let i = 0; i <= samples; i += 1) {
    const angle = (i / samples) * Math.PI * 2 + phase;
    const ellipticalRadius = radius * (1 - eccentricity * Math.cos(angle));
    const x = Math.cos(angle) * ellipticalRadius;
    const z = Math.sin(angle) * ellipticalRadius * (1 - eccentricity);
    const y = Math.sin(z * 0.35) * 0.02;
    const point = new THREE.Vector3(x, y, z);
    point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
    points.push(point);
  }

  return points;
}

function positionOnOrbit(asset, elapsedTime) {
  const angle = elapsedTime * asset.speed + asset.phase;
  const radius = asset.orbitRadius * (1 - asset.eccentricity * Math.cos(angle));
  const point = new THREE.Vector3(
    Math.cos(angle) * radius,
    Math.sin(angle * 0.35) * 0.02,
    Math.sin(angle) * radius * (1 - asset.eccentricity),
  );
  point.applyAxisAngle(
    new THREE.Vector3(1, 0, 0),
    THREE.MathUtils.degToRad(asset.inclination),
  );
  return point;
}

function Earth() {
  const earth = useRef();
  const clouds = useRef();
  const [earthMap, cloudMap] = useTexture([EARTH_TEXTURE, CLOUD_TEXTURE]);

  useFrame((_, delta) => {
    earth.current.rotation.y += delta * 0.035;
    clouds.current.rotation.y += delta * 0.055;
  });

  return (
    <group>
      <mesh ref={earth}>
        <sphereGeometry args={[1.8, 96, 96]} />
        <meshStandardMaterial
          map={earthMap}
          roughness={0.82}
          metalness={0.02}
          emissive="#06305a"
          emissiveIntensity={0.14}
        />
      </mesh>
      <mesh ref={clouds}>
        <sphereGeometry args={[1.815, 96, 96]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent
          opacity={0.26}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.91, 96, 96]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          uniforms={{
            glowColor: { value: new THREE.Color("#39d6ff") },
            intensity: { value: 0.62 },
          }}
          vertexShader={`
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 glowColor;
            uniform float intensity;
            varying vec3 vNormal;
            void main() {
              float atmosphere = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
              gl_FragColor = vec4(glowColor, atmosphere * intensity);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function OrbitRing({ asset, selected }) {
  const geometry = useMemo(() => {
    const points = makeOrbitPoints(
      asset.orbitRadius,
      asset.inclination,
      asset.eccentricity,
      asset.phase,
    );
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [asset]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        transparent
        opacity={selected ? 0.94 : asset.type === "debris" ? 0.33 : 0.42}
        color={selected ? "#7cf9ff" : riskPalette[asset.risk]}
      />
    </line>
  );
}

function TrackedObject({ asset, selected, onSelect }) {
  const mesh = useRef();

  useFrame(({ clock }) => {
    const point = positionOnOrbit(asset, clock.getElapsedTime());
    mesh.current.position.copy(point);
    mesh.current.rotation.y += 0.04;
  });

  const color = asset.type === "debris" ? riskPalette[asset.risk] : "#7cf9ff";

  return (
    <Trail
      width={selected ? 0.035 : 0.018}
      length={selected ? 8 : 4}
      color={color}
      attenuation={(t) => t * t}
    >
      <mesh ref={mesh} onClick={() => onSelect(asset.noradId)}>
        <sphereGeometry args={[asset.type === "debris" ? 0.038 : 0.055, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 1.8 : 0.9}
          roughness={0.25}
        />
        {selected && (
          <Html distanceFactor={8} position={[0.12, 0.12, 0]}>
            <div className="orbit-label">
              <strong>{asset.name}</strong>
              <span>{asset.closestApproachKm.toFixed(2)} km approach</span>
            </div>
          </Html>
        )}
      </mesh>
    </Trail>
  );
}

function DebrisField() {
  const { positions, colors } = useMemo(() => {
    const count = 520;
    const positionArray = new Float32Array(count * 3);
    const colorArray = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const shell = i % 4;
      const radius = 2.35 + shell * 0.28 + Math.random() * 0.18;
      const theta = Math.random() * Math.PI * 2;
      const polar = Math.acos(2 * Math.random() - 1);
      positionArray[i * 3] = radius * Math.sin(polar) * Math.cos(theta);
      positionArray[i * 3 + 1] = radius * Math.cos(polar) * 0.72;
      positionArray[i * 3 + 2] = radius * Math.sin(polar) * Math.sin(theta);

      const hot = shell > 1 || Math.random() > 0.72;
      const color = new THREE.Color(hot ? "#ff7b54" : "#46d9ff");
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }

    return { positions: positionArray, colors: colorArray };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.018}
        sizeAttenuation
        transparent
        opacity={0.64}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function GlobeScene({ selectedId, setSelectedId }) {
  return (
    <Canvas camera={{ position: [0, 2.6, 7.4], fov: 46 }} dpr={[1, 2]}>
      <color attach="background" args={["#020713"]} />
      <fog attach="fog" args={["#020713", 8, 14]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 2, 5]} intensity={2.8} color="#dff7ff" />
      <pointLight position={[-4, -2, -3]} intensity={4.2} color="#1a9dff" />
      <Stars radius={80} depth={45} count={2600} factor={3.5} fade speed={0.8} />
      <Suspense
        fallback={
          <mesh>
            <sphereGeometry args={[1.8, 64, 64]} />
            <meshStandardMaterial color="#063f71" emissive="#021b35" />
          </mesh>
        }
      >
        <Earth />
      </Suspense>
      <DebrisField />
      {trackedObjects.map((asset) => (
        <OrbitRing
          key={`${asset.noradId}-orbit`}
          asset={asset}
          selected={asset.noradId === selectedId}
        />
      ))}
      {trackedObjects.map((asset) => (
        <TrackedObject
          key={asset.noradId}
          asset={asset}
          selected={asset.noradId === selectedId}
          onSelect={setSelectedId}
        />
      ))}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3.3}
        maxDistance={10}
        rotateSpeed={0.48}
        panSpeed={0.35}
      />
    </Canvas>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, tone = "cyan" }) {
  return (
    <div className={`stat-card ${tone}`}>
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {sublabel && <small>{sublabel}</small>}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-title">
        <Icon size={17} />
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function RiskBadge({ risk }) {
  return (
    <span
      className="risk-badge"
      style={{ "--risk-color": riskPalette[risk] }}
    >
      {risk}
    </span>
  );
}

function SearchBar({ query, setQuery, selectedId, setSelectedId }) {
  const popular = ["ISS", "Starlink", "Hubble", "NOAA", "GPS"];

  return (
    <div className="search-cluster">
      <div className="search-input">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search satellite name or NORAD ID"
        />
      </div>
      <div className="quick-access">
        {popular.map((label) => (
          <button
            key={label}
            onClick={() => {
              const match = trackedObjects.find((asset) =>
                asset.name.toLowerCase().includes(label.toLowerCase()),
              );
              setQuery(label);
              if (match) setSelectedId(match.noradId);
            }}
            className={
              trackedObjects
                .find((asset) =>
                  asset.name.toLowerCase().includes(label.toLowerCase()),
                )
                ?.noradId === selectedId
                ? "active"
                : ""
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatProbability(value) {
  return `${(value * 100).toFixed(value > 0.01 ? 2 : 3)}%`;
}

export default function App() {
  const [selectedId, setSelectedId] = useState("25544");
  const [query, setQuery] = useState("");
  const [predictionWindow, setPredictionWindow] = useState("6 hours");

  const selectedAsset =
    trackedObjects.find((asset) => asset.noradId === selectedId) ||
    trackedObjects[0];

  const filteredObjects = trackedObjects.filter((asset) => {
    const term = query.trim().toLowerCase();
    return (
      !term ||
      asset.name.toLowerCase().includes(term) ||
      asset.noradId.includes(term)
    );
  });

  const riskCounts = trackedObjects.reduce((counts, asset) => {
    counts[asset.risk] = (counts[asset.risk] || 0) + 1;
    return counts;
  }, {});

  const debrisObjects = trackedObjects.filter((asset) => asset.type === "debris");
  const satellites = trackedObjects.filter((asset) => asset.type === "satellite");

  return (
    <main className="app-shell">
      <div className="orbital-background" />
      <header className="top-bar">
        <div className="brand">
          <div className="brand-mark">
            <Radar size={25} />
          </div>
          <div>
            <p>Mission Control Platform</p>
            <h1>Space Debris Collision Risk Tracker</h1>
          </div>
        </div>
        <SearchBar
          query={query}
          setQuery={setQuery}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
        <div className="system-status">
          <span className="status-dot" />
          <div>
            <strong>LIVE SSA FEED</strong>
            <small>CelesTrak / Space-Track ready</small>
          </div>
        </div>
      </header>

      <section className="globe-shell" aria-label="Interactive 3D Earth">
        <GlobeScene selectedId={selectedId} setSelectedId={setSelectedId} />
        <div className="camera-hint">
          <Crosshair size={16} />
          Drag rotate · Wheel zoom · Right-drag pan
        </div>
      </section>

      <aside className="left-stack">
        <Panel title="Satellite Intelligence" icon={Satellite}>
          <div className="selected-asset">
            <div>
              <p>{selectedAsset.type.toUpperCase()} · NORAD {selectedAsset.noradId}</p>
              <h2>{selectedAsset.name}</h2>
            </div>
            <RiskBadge risk={selectedAsset.risk} />
          </div>
          <div className="telemetry-grid">
            <StatCard
              icon={Gauge}
              label="Speed"
              value={`${selectedAsset.speedKmh.toLocaleString()} km/h`}
              sublabel="SGP4 propagated estimate"
            />
            <StatCard
              icon={Rocket}
              label="Height"
              value={`${selectedAsset.altitudeKm.toLocaleString()} km`}
              sublabel={`${selectedAsset.inclination.toFixed(1)} deg inclination`}
            />
            <StatCard
              icon={Globe2}
              label="Latitude"
              value={`${selectedAsset.latitude.toFixed(2)} deg`}
              sublabel="Current ground track"
            />
            <StatCard
              icon={Activity}
              label="Longitude"
              value={`${selectedAsset.longitude.toFixed(2)} deg`}
              sublabel={selectedAsset.operator}
            />
          </div>
        </Panel>

        <Panel title="Collision Risk Monitoring" icon={ShieldAlert}>
          <div className="risk-summary">
            <div>
              <span>Closest approach</span>
              <strong>{selectedAsset.closestApproachKm.toFixed(2)} km</strong>
            </div>
            <div>
              <span>Collision probability</span>
              <strong>{formatProbability(selectedAsset.collisionProbability)}</strong>
            </div>
          </div>
          <div className="object-list">
            {filteredObjects.map((asset) => (
              <button
                key={asset.noradId}
                className={asset.noradId === selectedId ? "active" : ""}
                onClick={() => setSelectedId(asset.noradId)}
              >
                <span>
                  <strong>{asset.name}</strong>
                  <small>NORAD {asset.noradId} · {asset.type}</small>
                </span>
                <RiskBadge risk={asset.risk} />
              </button>
            ))}
          </div>
        </Panel>
      </aside>

      <aside className="right-stack">
        <Panel title="Debris Analytics Dashboard" icon={Layers3}>
          <div className="metric-row">
            <StatCard
              icon={Satellite}
              label="Tracked satellites"
              value={satellites.length.toLocaleString()}
              sublabel="Primary assets"
            />
            <StatCard
              icon={Zap}
              label="Debris count"
              value="34,821"
              sublabel={`${debrisObjects.length} high-interest objects`}
              tone="amber"
            />
          </div>
          <Plot
            data={[
              {
                x: ["<500", "500-800", "800-1200", "MEO", "GEO"],
                y: [8100, 12840, 9340, 2870, 1671],
                type: "bar",
                marker: {
                  color: ["#31d2f7", "#45f4bb", "#ffd166", "#ff8a3d", "#ff3f71"],
                },
              },
            ]}
            layout={{
              height: 150,
              margin: { l: 32, r: 8, t: 6, b: 28 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
              font: { color: "#a9d7ef", size: 10 },
              xaxis: { gridcolor: "rgba(255,255,255,0.06)" },
              yaxis: { gridcolor: "rgba(255,255,255,0.06)" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            className="plot"
          />
          <div className="heatmap-card">
            <span>Debris density heatmap</span>
            <Plot
              data={[
                {
                  z: [
                    [0.2, 0.4, 0.7, 0.6],
                    [0.3, 0.8, 1.0, 0.7],
                    [0.1, 0.5, 0.9, 0.95],
                    [0.08, 0.2, 0.45, 0.62],
                  ],
                  type: "heatmap",
                  colorscale: [
                    [0, "#062642"],
                    [0.5, "#15c9ff"],
                    [1, "#ff3f71"],
                  ],
                  showscale: false,
                },
              ]}
              layout={{
                height: 110,
                margin: { l: 4, r: 4, t: 4, b: 4 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                xaxis: { visible: false },
                yaxis: { visible: false },
              }}
              config={{ displayModeBar: false, responsive: true }}
              className="plot"
            />
          </div>
        </Panel>

        <Panel title="Alert Center" icon={Bell}>
          <div className="alert-list">
            {alertFeed.map((alert) => (
              <article key={alert.title}>
                <AlertTriangle
                  size={17}
                  color={riskPalette[alert.risk]}
                  aria-hidden="true"
                />
                <div>
                  <header>
                    <strong>{alert.title}</strong>
                    <RiskBadge risk={alert.risk} />
                  </header>
                  <p>{alert.body}</p>
                  <small>{alert.eta}</small>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </aside>

      <section className="bottom-console">
        <Panel title="Prediction Engine" icon={Timer} className="prediction-panel">
          <div className="prediction-tabs">
            {predictionWindows.map((window) => (
              <button
                key={window.label}
                className={predictionWindow === window.label ? "active" : ""}
                onClick={() => setPredictionWindow(window.label)}
              >
                {window.label}
              </button>
            ))}
          </div>
          {predictionWindows
            .filter((window) => window.label === predictionWindow)
            .map((window) => (
              <div className="prediction-readout" key={window.label}>
                <div>
                  <span>Predicted conjunction events</span>
                  <strong>{window.events}</strong>
                </div>
                <div>
                  <span>Peak probability</span>
                  <strong>{window.probability}</strong>
                </div>
                <div>
                  <span>Primary risk corridor</span>
                  <strong>{window.corridor}</strong>
                </div>
                <div className="future-path">
                  <i />
                  <span>Future orbital paths highlighted on selected asset</span>
                </div>
              </div>
            ))}
        </Panel>

        <div className="mission-strip">
          <StatCard
            icon={Activity}
            label="SSA latency"
            value="1.8 s"
            sublabel="Real-time telemetry bus"
          />
          <StatCard
            icon={Radar}
            label="Conjunction screening"
            value="12,402"
            sublabel="pairings per cycle"
          />
          <StatCard
            icon={ShieldAlert}
            label="High-risk objects"
            value={riskCounts.High + riskCounts.Critical}
            sublabel="requires operator review"
            tone="red"
          />
        </div>
      </section>
    </main>
  );
}
