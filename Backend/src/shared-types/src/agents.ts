export interface AgentChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProfileInterviewState {
  completedTopics: string[];
  messages: AgentChatMessage[];
}
