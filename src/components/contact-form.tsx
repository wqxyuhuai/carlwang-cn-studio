"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<FormState>("idle");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    window.setTimeout(() => {
      const form = event.currentTarget;
      const data = new FormData(form);
      const email = String(data.get("email") || "");
      if (!email.includes("@")) {
        setState("error");
        return;
      }
      form.reset();
      setState("success");
    }, 360);
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
      <div className="form-grid">
        <label className="form-field">
          <span>Company</span>
          <input className="form-control" name="company" />
        </label>
        <label className="form-field">
          <span>Project Type</span>
          <select className="form-control" name="projectType">
            <option>Website</option>
            <option>Brand</option>
            <option>UI Product</option>
            <option>Motion</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <label className="form-field">
        <span>Message</span>
        <textarea className="form-control textarea-message" name="message" required />
      </label>
      {state === "error" ? <p className="text-muted">Please add a valid email before sending.</p> : null}
      {state === "success" ? <p className="text-muted">Thanks, I will get back to you.</p> : null}
      <button className="button-primary" disabled={state === "loading"} type="submit">
        {state === "loading" ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
