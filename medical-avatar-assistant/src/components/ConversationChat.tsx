import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAssistantLabel } from "../hooks/useAssistantLabel";
import { useConsultationCall } from "../context/ConsultationCallContext";
import { useSession } from "../context/SessionContext";
import styles from "./ConversationChat.module.css";

export function ConversationChat() {
  const { consultationActive, connected, isSetupComplete } = useSession();
  const assistantLabel = useAssistantLabel();
  const {
    messages,
    sendMessage,
    callConnecting,
    callConnected,
    callError,
  } = useConsultationCall();

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollMessagesToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    scrollMessagesToBottom();
  }, [messages, scrollMessagesToBottom]);

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    const pageScrollY = window.scrollY;
    const sent = sendMessage(draft);
    if (!sent) return;

    setDraft("");
    requestAnimationFrame(() => {
      scrollMessagesToBottom();
      window.scrollTo({ top: pageScrollY, behavior: "instant" });
      inputRef.current?.focus({ preventScroll: true });
    });
  };

  const canChat = consultationActive && callConnected;
  const disabled = !canChat;

  return (
    <section className={styles.chat} aria-label="Conversation chat">
      <header className={styles.header}>
        <h2 className={styles.title}>Chat</h2>
        <p className={styles.subtitle}>
          {callError
            ? callError
            : callConnecting
              ? "Connecting to your agent…"
              : callConnected
                ? `Messaging ${assistantLabel}`
                : consultationActive
                  ? "Starting session…"
                  : connected
                    ? "Begin the consultation to chat"
                    : "Waiting for connection"}
        </p>
      </header>

      <div
        ref={listRef}
        className={styles.messages}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className={styles.empty}>
            {isSetupComplete
              ? "Your messages will appear here."
              : "Complete setup to chat."}
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.bubble} ${
                message.role === "user"
                  ? styles.bubbleUser
                  : styles.bubbleAssistant
              }`}
            >
              <span className={styles.bubbleLabel}>
                {message.role === "user" ? "You" : assistantLabel}
              </span>
              <p className={styles.bubbleText}>
                {message.text}
                {message.streaming && (
                  <span
                    className={`${styles.streamingCursor} ${
                      message.role === "user"
                        ? styles.streamingCursorUser
                        : styles.streamingCursorAssistant
                    }`}
                    aria-hidden
                  >
                    {" "}
                    ▍
                  </span>
                )}
              </p>
            </div>
          ))
        )}
      </div>

      <form className={styles.composer} onSubmit={handleSend}>
        <label className={styles.srOnly} htmlFor="consultation-chat-input">
          Type your message
        </label>
        <textarea
          id="consultation-chat-input"
          ref={inputRef}
          className={styles.input}
          rows={2}
          placeholder={
            disabled
              ? callConnecting
                ? "Connecting…"
                : "Start consultation to send messages"
              : "Type your message…"
          }
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={disabled || !draft.trim()}
        >
          Send
        </button>
      </form>
    </section>
  );
}
