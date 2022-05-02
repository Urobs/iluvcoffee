import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

@Schema()
export class Event extends mongoose.Document {
  @Prop()
  type: string;

  @Prop({ index: true })
  name: string;

  @Prop({ type: mongoose.SchemaTypes.Mixed })
  payload: Record<string, any>;
}

export const eventSchema = SchemaFactory.createForClass(Event);
eventSchema.index({ name: 1, type: -1 });
