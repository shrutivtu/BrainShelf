import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';

export const INK_COLORS = [
  { name: 'Default', value: null },
  { name: 'Charcoal', value: '#3b3836' },
  { name: 'Blue', value: '#2b5797' },
  { name: 'Teal', value: '#1a7a6d' },
  { name: 'Red', value: '#b04040' },
  { name: 'Purple', value: '#6b5094' },
  { name: 'Burnt Orange', value: '#b06830' },
];

export const HIGHLIGHT_COLORS = [
  { name: 'None', value: null },
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Green', value: '#d1fae5' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Purple', value: '#ede9fe' },
];

export function getEditorExtensions() {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Link.configure({ openOnClick: true, autolink: true }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
  ];
}
