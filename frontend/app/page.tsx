import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CirclePlay,
  Layers3,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  ExerciseCards,
  MovementDiagram,
  PageHeading,
  PrivacyNote,
} from "@/components/page-parts";
import { Button } from "@/components/ui/button";

export default function Overview() {
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE MORE AWARENESS. EVERY REP."
        title="Move with a clearer picture."
        description="A new perspective on the way you move. Observe repetitions, explore your range, and build awareness."
      />
      <section className="hero panel">
        <div className="hero-copy">
          <span className="pill">
            <span className="status-dot blue" /> YOUR MOVEMENT, IN FOCUS
          </span>
          <h2>
            Meet your movement.
            <br />
            <span className="hero-accent">One rep at a time.</span>
          </h2>
          <p>
            Turn everyday exercise into understandable observations — with live
            sessions and video review, designed around your privacy.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link href="/workout/live">
                <Camera size={18} /> Explore live workout{" "}
                <ArrowUpRight size={16} />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/workout/upload">Explore video analysis</Link>
            </Button>
          </div>
          <p className="hero-footnote">
            <ShieldCheck size={14} /> Foundation preview · Capture and analysis
            coming later
          </p>
        </div>
        <div className="hero-visual">
          <div className="visual-grid" />
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="figure-label">
            <ScanLine size={15} /> MOVEMENT STUDY <span>01</span>
          </div>
          <MovementDiagram />
          <div className="diagram-annotation">
            OBSERVE <span>→</span> UNDERSTAND
          </div>
          <span className="illustration-label">
            Framing illustration · No measured data
          </span>
        </div>
      </section>
      <section className="path-grid">
        <Link className="path-card panel" href="/workout/live">
          <div className="path-icon">
            <CirclePlay size={23} />
          </div>
          <div>
            <span className="small-label">IN THE MOMENT</span>
            <h3>Live workout</h3>
            <p>A dedicated space for real-time movement observations.</p>
          </div>
          <ArrowUpRight className="path-arrow" size={21} />
        </Link>
        <Link className="path-card panel" href="/workout/upload">
          <div className="path-icon">
            <Upload size={23} />
          </div>
          <div>
            <span className="small-label">AT YOUR OWN PACE</span>
            <h3>Video analysis</h3>
            <p>Review a recorded session and explore each repetition.</p>
          </div>
          <ArrowUpRight className="path-arrow" size={21} />
        </Link>
      </section>
      <section className="library-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FOUR WAYS TO GET MOVING</p>
            <h2>Find your starting point</h2>
          </div>
          <Link href="/exercises">
            Explore the library <ArrowRight size={17} />
          </Link>
        </div>
        <ExerciseCards />
      </section>
      <PrivacyNote />
      <Link href="/about/methodology" className="method-link">
        <Layers3 size={17} /> Curious about the method behind the movement?{" "}
        <span>
          See how it works <ArrowUpRight size={14} />
        </span>
      </Link>
    </>
  );
}
