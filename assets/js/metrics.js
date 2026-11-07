/**
 * Confiteri — Métricas anônimas e avaliações públicas
 *
 * Este arquivo NÃO acessa o Supabase diretamente.
 * Toda comunicação com o banco ocorre pelas APIs serverless do Vercel.
 *
 * Nenhuma resposta do exame de consciência é enviada.
 */

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function escapeHtmlMetrics(value = "") {
  return String(value).replace(
    /[&<>'"]/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char])
  );
}

function sanitizeSource(source) {
  if (!source || typeof source !== "string") return "direct";

  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 50) || "direct";
}

function getTrafficSource() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");

  if (utmSource) return sanitizeSource(utmSource);

  const referrer = document.referrer;
  if (!referrer) return "direct";

  try {
    const host = new URL(referrer).hostname.toLowerCase();

    if (host.includes("google")) return "google";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("facebook")) return "facebook";
    if (host.includes("bing")) return "bing";
    if (host.includes("youtube")) return "youtube";

    return "other";
  } catch (_) {
    return "other";
  }
}

/* =========================================================
   VISITAS
   ========================================================= */

async function registerVisit() {
  if (sessionStorage.getItem("confiteri_visit_registered")) return;

  try {
    const response = await fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: getTrafficSource() })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }

    sessionStorage.setItem("confiteri_visit_registered", "true");
  } catch (error) {
    console.error("Confiteri: não foi possível registrar a visita.", error);
  }
}

/* =========================================================
   CONFISSÕES REGISTRADAS
   ========================================================= */

async function registerConfession() {
  if (localStorage.getItem("confiteri_confession_registered")) {
    return { success: false, alreadyRegistered: true };
  }

  try {
    const response = await fetch("/api/confession", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }

    localStorage.setItem("confiteri_confession_registered", "true");

    return { success: true, alreadyRegistered: false };
  } catch (error) {
    console.error("Confiteri: não foi possível registrar a Confissão.", error);
    return { success: false, alreadyRegistered: false };
  }
}

async function handleConfessionButton() {
  const button = document.getElementById("btn-confession-completed");
  const message = document.getElementById("confession-message");

  if (!button || !message) return;

  if (localStorage.getItem("confiteri_confession_registered")) {
    button.disabled = true;
    button.textContent = "✓ Confissão já registrada";
    message.textContent = "Esta Confissão já foi registrada neste dispositivo.";
    message.classList.remove("feedback-error");
    message.classList.add("feedback-success");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Registrando...";

  const result = await registerConfession();

  if (result.success || result.alreadyRegistered) {
    button.textContent = result.success
      ? "✓ Confissão registrada"
      : "✓ Confissão já registrada";

    message.textContent = result.success
      ? "Obrigado por registrar este fruto do Confiteri."
      : "Esta Confissão já foi registrada neste dispositivo.";

    message.classList.remove("feedback-error");
    message.classList.add("feedback-success");

    await loadPublicStats();
    return;
  }

  button.disabled = false;
  button.textContent = originalText;
  message.textContent = "Não foi possível registrar agora. Tente novamente.";
  message.classList.remove("feedback-success");
  message.classList.add("feedback-error");
}

/* =========================================================
   ENVIO DE AVALIAÇÕES
   ========================================================= */

async function submitReview({
  rating,
  name = "",
  comment = "",
  publishComment = false,
  publishName = false
}) {
  const numericRating = Number(rating);

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return { success: false, error: "Escolha uma nota entre 1 e 5." };
  }

  const safeName = String(name).trim().slice(0, 80);
  const safeComment = String(comment).trim().slice(0, 500);

  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: numericRating,
        name: safeName,
        comment: safeComment,
        publishComment: Boolean(publishComment),
        publishName: Boolean(publishName)
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Confiteri: não foi possível enviar a avaliação.", error);
    return {
      success: false,
      error: "Não foi possível enviar sua avaliação."
    };
  }
}

async function handleReviewSubmit() {
  const button = document.getElementById("btn-submit-review");
  const message = document.getElementById("review-message");

  if (!button || !message) return;

  const rating = Number(document.getElementById("review-rating")?.value);
  const name = document.getElementById("review-name")?.value || "";
  const comment = document.getElementById("review-comment")?.value || "";
  const publishComment =
    document.getElementById("review-publish-comment")?.checked || false;
  const publishName =
    document.getElementById("review-publish-name")?.checked || false;

  message.classList.remove("feedback-success", "feedback-error");

  if (!rating) {
    message.textContent = "Escolha uma nota antes de enviar.";
    message.classList.add("feedback-error");
    return;
  }

  if (publishName && !name.trim()) {
    message.textContent =
      "Informe seu nome ou desmarque a autorização de publicação do nome.";
    message.classList.add("feedback-error");
    return;
  }

  if (publishComment && !comment.trim()) {
    message.textContent =
      "Escreva um comentário ou desmarque a autorização de publicação.";
    message.classList.add("feedback-error");
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Enviando...";

  const result = await submitReview({
    rating,
    name,
    comment,
    publishComment,
    publishName
  });

  if (result.success) {
    button.textContent = "✓ Avaliação enviada";
    message.textContent =
      "Obrigado pela sua avaliação. Ela ajuda a melhorar o Confiteri.";
    message.classList.add("feedback-success");

    await loadPublicStats();
    return;
  }

  button.disabled = false;
  button.textContent = originalText;
  message.textContent = result.error || "Não foi possível enviar sua avaliação.";
  message.classList.add("feedback-error");
}

/* =========================================================
   ESTATÍSTICAS PÚBLICAS
   ========================================================= */

async function loadPublicStats() {
  try {
    const response = await fetch("/api/stats", {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const stats = await response.json();

    updateStat("stat-visits", stats.visits);
    updateStat("stat-confessions", stats.confessions);
    updateStat("stat-countries", stats.countries);

    const ratingElement = document.getElementById("stat-rating");
    const ratingLabel = document.getElementById("stat-rating-label");
    const testimonialsAverage =
      document.getElementById("testimonials-average");
    const testimonialsTotal =
      document.getElementById("testimonials-total");

    const reviewCount = Number(stats.reviews || 0);

    if (reviewCount > 0) {
      const rating = Number(stats.ratingAverage || 0)
        .toFixed(1)
        .replace(".", ",");

      if (ratingElement) animateText(ratingElement, `★ ${rating}`);

      if (ratingLabel) {
        ratingLabel.textContent =
          `${reviewCount} ${reviewCount === 1 ? "avaliação recebida" : "avaliações recebidas"}`;
      }

      if (testimonialsAverage) testimonialsAverage.textContent = rating;

      if (testimonialsTotal) {
        testimonialsTotal.textContent =
          `${reviewCount} ${reviewCount === 1 ? "avaliação recebida" : "avaliações recebidas"}`;
      }
    } else {
      if (ratingElement) ratingElement.textContent = "—";
      if (ratingLabel) ratingLabel.textContent = "avaliação média";
      if (testimonialsAverage) testimonialsAverage.textContent = "—";
      if (testimonialsTotal) testimonialsTotal.textContent = "Ainda sem avaliações";
    }
  } catch (error) {
    console.error("Confiteri: erro ao carregar estatísticas.", error);
  }
}

function updateStat(id, value) {
  const element = document.getElementById(id);
  if (!element) return;

  animateNumber(element, Number(value || 0));
}

function animateNumber(element, finalValue) {
  const duration = 700;
  const startTime = performance.now();

  function frame(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(finalValue * eased);

    element.textContent = current.toLocaleString("pt-BR");

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function animateText(element, value) {
  element.style.opacity = "0";

  setTimeout(() => {
    element.textContent = value;
    element.style.transition = "opacity .25s ease";
    element.style.opacity = "1";
  }, 100);
}


// Painel de países: consulta somente totais agregados do servidor.
function initializeImpactDetails() {
  const panel = document.getElementById("impact-detail-panel");
  const title = document.getElementById("impact-detail-title");
  const description = document.getElementById("impact-detail-description");
  const content = document.getElementById("impact-detail-content");
  const buttons = [...document.querySelectorAll("[data-impact-detail], #toggle-countries")];
  if (!panel || !title || !description || !content) return;

  const details = {
    visits: ["Visitas ao Confiteri", "Total de acessos registrados ao site. Não representa pessoas únicas.", "As visitas são contabilizadas de forma agregada, sem acessar respostas do exame de consciência."],
    confessions: ["Confissões registradas", "Registros voluntários feitos por visitantes após a Confissão.", "O contador representa apenas confirmações voluntárias. Nenhum pecado ou resposta do exame é enviado ao servidor."],
    rating: ["Avaliações do Confiteri", "Opiniões compartilhadas voluntariamente pelos visitantes.", "As avaliações ajudam a melhorar o Confiteri."]
  };
  let countriesLoaded = false;
  let countryRows = [];
  const names = new Intl.DisplayNames(["pt-BR"], { type: "region" });

  function close() {
    panel.hidden = true;
    buttons.forEach(button => button.setAttribute("aria-expanded", "false"));
  }

  async function showCountries() {
    content.textContent = "Carregando países...";
    try {
      if (!countriesLoaded) {
        const response = await fetch("/api/countries", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.success || !Array.isArray(data.countries)) throw new Error("Resposta inválida");
        countryRows = data.countries;
        countriesLoaded = true;
      }
      content.replaceChildren();
      if (!countryRows.length) {
        content.textContent = "Ainda não há países identificados.";
        return;
      }
      const total = countryRows.reduce((sum, item) => sum + Math.max(0, Number(item.visits) || 0), 0);
      const list = document.createElement("div");
      list.className = "impact-countries-list";
      for (const item of countryRows) {
        const code = String(item.code || "").toUpperCase();
        if (!/^[A-Z]{2}$/.test(code)) continue;
        const count = Math.max(0, Number(item.visits) || 0);
        const flag = [...code].map(letter => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join("");
        const row = document.createElement("div");
        row.className = "impact-country-row";
        const label = document.createElement("span");
        label.textContent = `${flag} ${names.of(code) || code}`;
        const value = document.createElement("span");
        value.textContent = `${count.toLocaleString("pt-BR")} ${count === 1 ? "visita" : "visitas"}`;
        const track = document.createElement("div");
        track.className = "impact-country-track";
        const fill = document.createElement("div");
        fill.className = "impact-country-fill";
        fill.style.width = `${total ? (count / total) * 100 : 0}%`;
        track.append(fill);
        row.append(label, value, track);
        list.append(row);
      }
      content.append(list);
    } catch (error) {
      console.error("Confiteri: erro ao carregar países.", error);
      content.textContent = "Não foi possível carregar os países. Feche e abra novamente para tentar.";
    }
  }

  buttons.forEach(button => button.addEventListener("click", () => {
    const type = button.id === "toggle-countries" ? "countries" : button.dataset.impactDetail;
    if (!panel.hidden && button.getAttribute("aria-expanded") === "true") {
      close();
      return;
    }
    buttons.forEach(other => other.setAttribute("aria-expanded", String(other === button)));
    panel.hidden = false;
    content.replaceChildren();
    if (type === "countries") {
      title.textContent = "Nossa presença pelo mundo";
      description.textContent = "Visitas por país, sem identificar visitantes.";
      void showCountries();
      return;
    }
    const [heading, subtitle, body] = details[type] || details.visits;
    title.textContent = heading;
    description.textContent = subtitle;
    const paragraph = document.createElement("p");
    paragraph.className = "impact-detail-note";
    paragraph.textContent = body;
    content.append(paragraph);
    if (type === "rating") {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "impact-reviews-btn";
      link.textContent = "★ Ver avaliações";
      link.addEventListener("click", openTestimonialsModal);
      content.append(link);
    }
  }));
  document.getElementById("impact-detail-close")?.addEventListener("click", close);
}

/* =========================================================
   AVALIAÇÕES PÚBLICAS
   ========================================================= */

async function loadPublicTestimonials() {
  try {
    const response = await fetch("/api/reviews", {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    renderTestimonials(Array.isArray(data.reviews) ? data.reviews : []);
  } catch (error) {
    console.error(
      "Confiteri: não foi possível carregar avaliações públicas.",
      error
    );

    const list = document.getElementById("testimonials-list");

    if (list) {
      list.innerHTML = `
            <div class="empty-state">
              Não foi possível carregar as avaliações agora.
            </div>
          `;
    }
  }
}

function renderTestimonials(reviews = []) {
  const list = document.getElementById("testimonials-list");
  if (!list) return;

  const published = reviews.filter(review =>
    (review.publish_comment === true || review.publishComment === true) &&
    review.comment
  );

  if (!published.length) {
    list.innerHTML = `
          <div class="empty-state">
            Ainda não há comentários autorizados para publicação.
          </div>
        `;
    return;
  }

  list.innerHTML = published.map(review => {
    const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

    const canPublishName =
      review.publish_name === true || review.publishName === true;

    const name =
      canPublishName && review.name
        ? review.name
        : "Avaliação anônima";

    return `
          <article class="testimonial-card">
            <div
              class="testimonial-card-stars"
              aria-label="${rating} de 5 estrelas"
            >
              ${stars}
            </div>

            <blockquote>
              “${escapeHtmlMetrics(review.comment)}”
            </blockquote>

            <div class="testimonial-meta">
              <strong>${escapeHtmlMetrics(name)}</strong>
            </div>
          </article>
        `;
  }).join("");
}

/* =========================================================
   MODAIS
   ========================================================= */

let previousModalFocus = null;

function setPageModalState(open) {
  document.body.style.overflow = open ? "hidden" : "";
}

function openFeedbackModal(modal) {
  if (!modal) return;
  const otherOpen = document.querySelector(".feedback-modal:not([hidden])");
  if (otherOpen && otherOpen !== modal) otherOpen.hidden = true;
  if (!otherOpen) previousModalFocus = document.activeElement;
  modal.hidden = false;
  setPageModalState(true);
  modal.querySelector(".feedback-modal-close, button, input, select")?.focus();
}

function closeFeedbackModal(modal, restoreFocus = true) {
  if (!modal) return;
  modal.hidden = true;
  const stillOpen = document.querySelector(".feedback-modal:not([hidden])");
  setPageModalState(Boolean(stillOpen));
  if (!stillOpen && restoreFocus) {
    previousModalFocus?.focus?.();
    previousModalFocus = null;
  }
}

function openTestimonialsModal() {
  openFeedbackModal(document.getElementById("testimonials-modal"));
}

function closeTestimonialsModal() {
  closeFeedbackModal(document.getElementById("testimonials-modal"));
}

function initializeFeedbackModals() {
  const confessionModal = document.getElementById("confession-modal");
  const reviewModal = document.getElementById("review-modal");
  const testimonialsModal = document.getElementById("testimonials-modal");

  document.getElementById("open-confession-modal")
    ?.addEventListener("click", () => openFeedbackModal(confessionModal));
  document.getElementById("open-review-modal")
    ?.addEventListener("click", () => openFeedbackModal(reviewModal));
  document.getElementById("open-testimonials-button")
    ?.addEventListener("click", openTestimonialsModal);

  document.querySelectorAll("[data-close-feedback-modal], [data-close-testimonials-modal]")
    .forEach(element => {
      element.addEventListener("click", () => {
        closeFeedbackModal(element.closest(".feedback-modal"));
      });
    });

  document.getElementById("testimonials-review-button")
    ?.addEventListener("click", () => {
      closeFeedbackModal(testimonialsModal, false);
      openFeedbackModal(reviewModal);
    });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const active = document.querySelector(".feedback-modal:not([hidden])");
    if (active) closeFeedbackModal(active);
  });
}

/* =========================================================
   EVENTOS DOS BOTÕES
   ========================================================= */

function initializeFeedbackArea() {
  const confessionButton =
    document.getElementById("btn-confession-completed");

  const reviewButton =
    document.getElementById("btn-submit-review");

  confessionButton?.addEventListener("click", handleConfessionButton);
  reviewButton?.addEventListener("click", handleReviewSubmit);

  if (
    confessionButton &&
    localStorage.getItem("confiteri_confession_registered")
  ) {
    confessionButton.disabled = true;
    confessionButton.textContent = "✓ Confissão já registrada";
  }
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  registerVisit();
  initializeFeedbackArea();
  initializeFeedbackModals();
  initializeImpactDetails();
  loadPublicStats();
  loadPublicTestimonials();
});
