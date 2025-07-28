import mongoose, { Schema, Document, Types, model, models } from "mongoose";

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String },
    imageUrl: { type: String },
    videoUrl: { type: String },
    fileUrl: { type: String },
  },
  { timestamps: true }
);

// ✅ Proper typing for model export
const Message = models.Message || model<IMessage>("Message", MessageSchema);
export default Message;
