import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type TranscriptionSegment,
} from "livekit-client";
import { createConsultationCall } from "../api/client";
import { useSession } from "./SessionContext";

const BEY_AVATAR_IDENTITY = "avatar_worker";
const CHAT_TOPIC = "lk.chat";
const TRANSCRIPTION_TOPIC = "lk.transcription";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  /** True while the agent is still speaking (live transcription). */
  streaming?: boolean;
  /** Links streaming bubbles to LiveKit transcription segment ids. */
  segmentId?: string;
}

interface ConsultationCallContextValue {
  callConnecting: boolean;
  callConnected: boolean;
  callError: string | null;
  messages: ChatMessage[];
  sendMessage: (text: string) => boolean;
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  audioContainerRef: React.RefObject<HTMLAudioElement | null>;
  toggleMicrophone: () => Promise<void>;
  micEnabled: boolean;
}

const ConsultationCallContext =
  createContext<ConsultationCallContextValue | null>(null);

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isAgentParticipant(participant: Participant): boolean {
  return participant.identity === BEY_AVATAR_IDENTITY;
}

function transcriptionKey(role: ChatMessage["role"], segmentId: string): string {
  return `${role}:${segmentId}`;
}

function resolveTranscriptionRole(
  identity: string,
  localIdentity: string,
): ChatMessage["role"] | null {
  if (identity === localIdentity) return "user";
  // Bey agent (and any other remote) publishes assistant speech on lk.transcription.
  return "assistant";
}

function isTranscriptionFinal(attrs: Record<string, unknown>): boolean {
  const value = attrs["lk.transcription_final"];
  return value === true || value === "true" || value === "1";
}

export function ConsultationCallProvider({ children }: { children: ReactNode }) {
  const { agent, consultationActive, endConsultation } = useSession();
  const [callConnecting, setCallConnecting] = useState(false);
  const [callConnected, setCallConnected] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [micEnabled, setMicEnabled] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const audioContainerRef = useRef<HTMLAudioElement>(null);
  const greetedRef = useRef(false);

  const appendMessage = useCallback((role: ChatMessage["role"], text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role, text: trimmed, at: Date.now() },
    ]);
  }, []);

  const upsertTranscription = useCallback(
    (role: ChatMessage["role"], segment: TranscriptionSegment) => {
      const trimmed = segment.text.trim();
      if (!trimmed) return;

      const key = transcriptionKey(role, segment.id);

      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (message) => message.segmentId === key,
        );

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          // Never replace a longer transcript with a shorter partial update.
          const text =
            trimmed.length >= existing.text.length ? trimmed : existing.text;
          const next = [...prev];
          next[existingIndex] = {
            ...existing,
            text,
            streaming: !segment.final,
          };
          return next;
        }

        const finalized = prev.map((message) =>
          message.role === role && message.streaming && message.segmentId !== key
            ? { ...message, streaming: false }
            : message,
        );

        // Drop duplicate assistant bubbles (e.g. greeting + transcription).
        const last = finalized[finalized.length - 1];
        if (
          role === "assistant" &&
          last?.role === "assistant" &&
          !last.segmentId &&
          (last.text === trimmed ||
            trimmed.startsWith(last.text) ||
            last.text.startsWith(trimmed))
        ) {
          const next = [...finalized];
          next[next.length - 1] = {
            ...last,
            text: trimmed.length >= last.text.length ? trimmed : last.text,
            streaming: !segment.final,
            segmentId: key,
          };
          return next;
        }

        return [
          ...finalized,
          {
            id: createMessageId(),
            role,
            text: trimmed,
            at: Date.now(),
            streaming: !segment.final,
            segmentId: key,
          },
        ];
      });
    },
    [],
  );

  const handleRemoteChatMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          if (last.text === trimmed) return prev;
          if (last.streaming && trimmed.startsWith(last.text)) {
            const next = [...prev];
            next[next.length - 1] = {
              ...last,
              text: trimmed,
              streaming: false,
            };
            return next;
          }
          if (
            last.segmentId &&
            (trimmed === last.text || trimmed.startsWith(last.text))
          ) {
            return prev;
          }
        }
        return [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            text: trimmed,
            at: Date.now(),
          },
        ];
      });
    },
    [],
  );

  const detachAgentMedia = useCallback(() => {
    const container = videoContainerRef.current;
    if (container) {
      container.replaceChildren();
    }
    const audioEl = audioContainerRef.current;
    if (audioEl) {
      audioEl.srcObject = null;
    }
  }, []);

  const renderAgentParticipant = useCallback(
    (participant: Participant) => {
      if (!isAgentParticipant(participant)) return;

      const cameraPub = participant.getTrackPublication(Track.Source.Camera);
      const micPub = participant.getTrackPublication(Track.Source.Microphone);

      const container = videoContainerRef.current;
      if (container && cameraPub?.videoTrack) {
        container.replaceChildren();
        const videoEl = cameraPub.videoTrack.attach();
        videoEl.className = "bey-agent-video";
        videoEl.setAttribute("playsinline", "true");
        container.appendChild(videoEl);
      }

      const audioEl = audioContainerRef.current;
      if (audioEl && micPub?.audioTrack) {
        micPub.audioTrack.attach(audioEl);
      }
    },
    [],
  );

  const disconnectRoom = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    greetedRef.current = false;
    setCallConnected(false);
    setCallConnecting(false);
    setMicEnabled(false);
    detachAgentMedia();

    if (room) {
      room.unregisterTextStreamHandler(TRANSCRIPTION_TOPIC);
      await room.disconnect();
    }
  }, [detachAgentMedia]);

  useEffect(() => {
    if (!consultationActive || !agent?.id) {
      void disconnectRoom();
      setCallError(null);
      setMessages([]);
      return;
    }

    const beyAgentId = agent.id;
    const greeting = agent.greeting ?? null;
    let cancelled = false;

    async function startCall() {
      setCallConnecting(true);
      setCallError(null);
      setMessages([]);

      if (greeting && !greetedRef.current) {
        greetedRef.current = true;
        appendMessage("assistant", greeting);
      }

      try {
        const { livekitUrl, livekitToken } = await createConsultationCall(
          beyAgentId,
        );
        if (cancelled) return;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        roomRef.current = room;

        room.registerTextStreamHandler(
          TRANSCRIPTION_TOPIC,
          async (reader, { identity }) => {
            const localIdentity = room.localParticipant.identity;
            const role = resolveTranscriptionRole(identity, localIdentity);
            if (!role) return;

            const attrs = reader.info.attributes ?? {};
            const segmentId = String(
              attrs["lk.segment_id"] ?? reader.info.id,
            );
            // Chunks are deltas; accumulate (see TextStreamReader.readAll).
            let accumulated = "";

            const toSegment = (text: string, final: boolean): TranscriptionSegment => ({
              id: segmentId,
              text,
              language: "",
              startTime: 0,
              endTime: 0,
              final,
              firstReceivedTime: Date.now(),
              lastReceivedTime: Date.now(),
            });

            try {
              for await (const chunk of reader) {
                accumulated += chunk;
                if (accumulated.trim()) {
                  upsertTranscription(
                    role,
                    toSegment(
                      accumulated,
                      isTranscriptionFinal(attrs),
                    ),
                  );
                }
              }

              if (accumulated.trim()) {
                upsertTranscription(role, toSegment(accumulated, true));
              }
            } catch {
              /* stream aborted */
            }
          },
        );

        room
          .on(RoomEvent.ParticipantConnected, (participant) => {
            renderAgentParticipant(participant);
          })
          .on(RoomEvent.TrackSubscribed, (_track, _pub, participant) => {
            renderAgentParticipant(participant);
          })
          .on(RoomEvent.TrackUnsubscribed, () => {
            detachAgentMedia();
          })
          .on(RoomEvent.ChatMessage, (msg, participant) => {
            if (participant?.isLocal) return;
            handleRemoteChatMessage(msg.message);
          })
          .on(RoomEvent.Disconnected, () => {
            if (!cancelled) {
              setCallConnected(false);
              endConsultation();
            }
          });

        await room.connect(livekitUrl, livekitToken);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        await room.localParticipant.setMicrophoneEnabled(true);
        setMicEnabled(true);

        room.remoteParticipants.forEach((participant) => {
          renderAgentParticipant(participant);
        });

        await room.startAudio();

        setCallConnected(true);
        setCallConnecting(false);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to start consultation.";
        setCallError(message);
        setCallConnecting(false);
        setCallConnected(false);
        endConsultation();
      }
    }

    void startCall();

    return () => {
      cancelled = true;
      void disconnectRoom();
    };
  }, [
    agent?.id,
    agent?.greeting,
    appendMessage,
    consultationActive,
    detachAgentMedia,
    disconnectRoom,
    endConsultation,
    handleRemoteChatMessage,
    renderAgentParticipant,
    upsertTranscription,
  ]);

  const sendMessage = useCallback(
    (text: string): boolean => {
      const room = roomRef.current;
      const trimmed = text.trim();
      if (!room || !trimmed || !callConnected) return false;

      room.localParticipant.sendText(trimmed, { topic: CHAT_TOPIC });
      // Voice transcriptions arrive via lk.transcription; only append for typed input.
      appendMessage("user", trimmed);
      return true;
    },
    [appendMessage, callConnected],
  );

  const toggleMicrophone = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, []);

  const value = useMemo<ConsultationCallContextValue>(
    () => ({
      callConnecting,
      callConnected,
      callError,
      messages,
      sendMessage,
      videoContainerRef,
      audioContainerRef,
      toggleMicrophone,
      micEnabled,
    }),
    [
      callConnecting,
      callConnected,
      callError,
      messages,
      sendMessage,
      toggleMicrophone,
      micEnabled,
    ],
  );

  return (
    <ConsultationCallContext.Provider value={value}>
      {children}
    </ConsultationCallContext.Provider>
  );
}

export function useConsultationCall(): ConsultationCallContextValue {
  const ctx = useContext(ConsultationCallContext);
  if (!ctx) {
    throw new Error(
      "useConsultationCall must be used within ConsultationCallProvider",
    );
  }
  return ctx;
}
