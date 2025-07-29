import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  isGroup: boolean;
  groupName?: string;
  lastMessage?: Types.ObjectId;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [
      { type: Schema.Types.ObjectId, ref: "User", required: true },
    ],
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: null },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message", default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
