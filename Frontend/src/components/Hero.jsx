import heroImage from '../assets/herosection.jpg';

// Hero section: unchanged from the original design.
export default function Hero() {
  return (
    <div className="hero-section" style={{ backgroundImage: `url(${heroImage})` }}>
      <div className="hero-msg">
        <p>
          You are on the basemark You can shop on basemark nepal for millons of products
          with fast local delivery.
          <a>Click here to go to basemark.in</a>
        </p>
      </div>
    </div>
  );
}
