type GenerationStep = {
  description: string;
  title: string;
};

type GenerationCard = {
  bullets: string[];
  eyebrow: string;
  title: string;
};

type GenerationOverlayProps = {
  activeStep: number;
  cards: GenerationCard[];
  description: string;
  eyebrow: string;
  isOpen: boolean;
  meta: string[];
  steps: GenerationStep[];
  title: string;
};

export function GenerationOverlay({
  activeStep,
  cards,
  description,
  eyebrow,
  isOpen,
  meta,
  steps,
  title
}: GenerationOverlayProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="generation-overlay">
      <div className="generation-overlay__backdrop" />
      <div aria-modal="true" className="generation-overlay__dialog" role="dialog">
        <section className="generation-overlay__copy">
          <p className="generation-overlay__eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="generation-overlay__description">{description}</p>

          <div className="generation-overlay__meta">
            {meta.map((item) => (
              <span className="generation-overlay__meta-chip" key={item}>
                {item}
              </span>
            ))}
          </div>

          <div className="generation-overlay__steps">
            {steps.map((step, index) => {
              const stateClass = index === activeStep ? "is-active" : index < activeStep ? "is-complete" : "is-pending";

              return (
                <article className={`generation-overlay__step ${stateClass}`} key={step.title}>
                  <span aria-hidden="true" className="generation-overlay__step-dot" />
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="generation-overlay__preview">
          <div className="generation-overlay__preview-head">
            <div>
              <p className="generation-overlay__preview-label">Preview</p>
              <strong>生成中的结构预览</strong>
            </div>
            <span className="generation-overlay__status">进行中</span>
          </div>

          <div className="generation-overlay__cards">
            {cards.map((card, index) => (
              <article
                className="generation-overlay__card"
                key={card.title}
                style={{ animationDelay: `${index * 140}ms` }}
              >
                <div className="generation-overlay__card-top">
                  <span>{card.eyebrow}</span>
                  <span>Live</span>
                </div>
                <h3>{card.title}</h3>
                <div className="generation-overlay__card-line" />
                <ul>
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
