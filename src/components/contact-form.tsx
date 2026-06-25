"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export function ContactForm({ sourcePage = "/about#contact", variant = "default" }: { sourcePage?: string; variant?: "default" | "about" }) {
  const [state, setState] = useState<FormState>("idle");
  const isAbout = variant === "about";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    setState("loading");

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
        return;
      }

      form.reset();
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (isAbout) {
    return (
      <form className="pw-static-form" onSubmit={submit}>
        <div className="pw-form-grid">
          <input aria-label="Name" className="pw-static-input" name="name" placeholder="Name*" required />
          <input aria-label="Email" className="pw-static-input" name="email" placeholder="Email*" required type="email" />
        </div>
        <textarea aria-label="Message" className="pw-static-textarea" maxLength={2000} name="message" placeholder="Message*" required />
        <input aria-hidden="true" className="contact-honeypot" name="website" tabIndex={-1} />
        {state === "error" ? <p className="text-muted">Please add a valid email before sending.</p> : null}
        {state === "success" ? <p className="text-muted">Thanks, I will get back to you.</p> : null}
        <button className="pw-static-submit" disabled={state === "loading"} type="submit">
          {state === "loading" ? "Sending" : "Send Message"}
        </button>
      </form>
    );
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field">
          <span>Name</span>
          <input className="form-control" name="name" required />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input className="form-control" name="email" required type="email" />
        </label>
      </div>
      <label className="form-field">
        <span>Message</span>
        <textarea className="form-control textarea-message" maxLength={2000} name="message" required />
      </label>
      <label className="form-field contact-honeypot">
        <span>Website</span>
        <input className="form-control" name="website" tabIndex={-1} />
      </label>
      {state === "error" ? <p className="text-muted">Please add a valid email before sending.</p> : null}
      {state === "success" ? <p className="text-muted">Thanks, I will get back to you.</p> : null}
      <button className="button-primary" disabled={state === "loading"} type="submit">
        {state === "loading" ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
