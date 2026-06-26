"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";
type FeedbackTone = "idle" | "success" | "error";
type FieldNames = "name" | "email" | "message";

const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 500;
const SUBMISSION_ERROR_MESSAGE = "Unable to send your message right now. Please try again later.";

export function ContactForm({ sourcePage = "/about#contact", variant = "default" }: { sourcePage?: string; variant?: "default" | "about" }) {
  const [state, setState] = useState<FormState>("idle");
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; text: string }>({ tone: "idle", text: "" });
  const [errors, setErrors] = useState<Record<FieldNames, boolean>>({
    email: false,
    message: false,
    name: false
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const isAbout = variant === "about";

  const messageLength = message.length;
  const isMessageOverLimit = messageLength > MAX_MESSAGE_LENGTH;

  function validateValues(values: { name: string; email: string; message: string }) {
    return {
      email: !values.email || !EMAIL_REGEXP.test(values.email),
      message: !values.message || values.message.length > MAX_MESSAGE_LENGTH,
      name: !values.name
    };
  }

  function updateField(field: FieldNames, value: string) {
    if (field === "name") setName(value);
    if (field === "email") setEmail(value);
    if (field === "message") setMessage(value);

    setErrors((prev) => ({
      ...prev,
      [field]:
        field === "email"
          ? !value.trim() || !EMAIL_REGEXP.test(value.trim())
          : field === "message"
            ? !value.trim() || value.length > MAX_MESSAGE_LENGTH
            : !value.trim()
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    const nextErrors = validateValues({
      email: trimmedEmail,
      message: trimmedMessage,
      name: trimmedName
    });

    setErrors(nextErrors);

    const hasErrors = nextErrors.email || nextErrors.message || nextErrors.name;
    if (hasErrors) {
      setState("error");
      if (!trimmedName || !trimmedEmail || !trimmedMessage) {
        setFeedback({ tone: "error", text: "Please fill in all required fields." });
      } else if (message.length > MAX_MESSAGE_LENGTH) {
        setFeedback({ tone: "error", text: `Message must be no more than ${MAX_MESSAGE_LENGTH} characters.` });
      } else {
        setFeedback({ tone: "error", text: "Please add a valid email before sending." });
      }
      return;
    }

    setState("loading");
    setFeedback({ tone: "idle", text: "" });
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...Object.fromEntries(data), sourcePage })
      });

      if (!response.ok) {
        setState("error");
        setFeedback({ tone: "error", text: SUBMISSION_ERROR_MESSAGE });
        return;
      }

      form.reset();
      setName("");
      setEmail("");
      setMessage("");
      setErrors({ email: false, message: false, name: false });
      setState("success");
      setFeedback({ tone: "success", text: "Thanks, I will get back to you." });
    } catch {
      setState("error");
      setFeedback({ tone: "error", text: SUBMISSION_ERROR_MESSAGE });
    }
  }

  if (isAbout) {
    return (
      <form className="pw-static-form" noValidate onSubmit={submit}>
        <div className="pw-form-grid">
          <input
            aria-label="Name"
            className={`pw-static-input ${errors.name ? "is-error" : ""}`}
            name="name"
            placeholder="Name*"
            value={name}
            onChange={(event) => updateField("name", event.currentTarget.value)}
          />
          <input
            aria-label="Email"
            className={`pw-static-input ${errors.email ? "is-error" : ""}`}
            name="email"
            placeholder="Email*"
            type="email"
            value={email}
            onChange={(event) => updateField("email", event.currentTarget.value)}
          />
        </div>
        <div className="pw-message-field">
          <textarea
            aria-label="Message"
            className={`pw-static-textarea ${errors.message ? "is-error" : ""}`}
            name="message"
            placeholder="Message*"
            value={message}
            onChange={(event) => updateField("message", event.currentTarget.value)}
          />
          {messageLength > 0 ? (
            <p className={`pw-form-meta ${isMessageOverLimit ? "is-over" : ""}`}>
              {messageLength}/{MAX_MESSAGE_LENGTH}
            </p>
          ) : null}
        </div>
        <input aria-hidden="true" className="contact-honeypot" name="website" tabIndex={-1} />
        {feedback.tone !== "idle" ? <p className={`body-copy pw-form-feedback pw-form-feedback--${feedback.tone}`}>{feedback.text}</p> : null}
        <button className="pw-static-submit" disabled={state === "loading"} type="submit">
          {state === "loading" ? "Sending" : "Send Message"}
        </button>
      </form>
    );
  }

  return (
    <form className="contact-form" noValidate onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field">
          <span>Name</span>
          <input
            className={`form-control ${errors.name ? "is-error" : ""}`}
            name="name"
            type="text"
            value={name}
            onChange={(event) => updateField("name", event.currentTarget.value)}
          />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input
            className={`form-control ${errors.email ? "is-error" : ""}`}
            name="email"
            type="email"
            value={email}
            onChange={(event) => updateField("email", event.currentTarget.value)}
          />
        </label>
      </div>
      <label className="form-field pw-message-field">
        <span>Message</span>
        <textarea
          className={`form-control textarea-message ${errors.message ? "is-error" : ""}`}
          name="message"
          value={message}
          onChange={(event) => updateField("message", event.currentTarget.value)}
        />
        {messageLength > 0 ? (
          <p className={`pw-form-meta ${isMessageOverLimit ? "is-over" : ""}`}>
            {messageLength}/{MAX_MESSAGE_LENGTH}
          </p>
        ) : null}
      </label>
      <label className="form-field contact-honeypot">
        <span>Website</span>
        <input className="form-control" name="website" tabIndex={-1} />
      </label>
      {feedback.tone !== "idle" ? <p className={`body-copy pw-form-feedback pw-form-feedback--${feedback.tone}`}>{feedback.text}</p> : null}
      <button className="button-primary" disabled={state === "loading"} type="submit">
        {state === "loading" ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
