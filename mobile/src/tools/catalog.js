const tool = (name, icon = 'tools', tone = 'red', status = 'planned', route = null) => Object.freeze({ name, icon, tone, status, route });

export const TOOL_CATEGORIES = Object.freeze([
  { name: 'Organize PDF', tools: [tool('Merge PDF', 'merge', 'red', 'available', '#/tools/merge'), tool('Split PDF', 'split'), tool('Reorder Pages'), tool('Delete Pages'), tool('Extract Pages'), tool('Rotate PDF')] },
  { name: 'Edit PDF', tools: [tool('Edit PDF', 'tools', 'blue'), tool('Crop PDF', 'tools', 'blue'), tool('Watermark', 'tools', 'blue'), tool('Page Numbers', 'tools', 'blue')] },
  { name: 'Security', tools: [tool('Protect PDF', 'shield', 'green'), tool('Unlock PDF', 'shield', 'green'), tool('Sign PDF', 'shield', 'green')] },
  { name: 'Optimize', tools: [tool('Compress PDF', 'compress', 'amber'), tool('Flatten PDF', 'compress', 'amber'), tool('Repair PDF', 'compress', 'amber')] },
  { name: 'Convert', tools: [tool('PDF to JPG', 'image', 'violet'), tool('JPG to PDF', 'image', 'violet'), tool('PDF to Word', 'image', 'violet'), tool('Word to PDF', 'image', 'violet'), tool('PDF to Excel', 'image', 'violet'), tool('Excel to PDF', 'image', 'violet'), tool('PDF to PowerPoint', 'image', 'violet')] },
]);

export const QUICK_TOOLS = Object.freeze([
  TOOL_CATEGORIES[0].tools[0],
  TOOL_CATEGORIES[0].tools[1],
  TOOL_CATEGORIES[3].tools[0],
  TOOL_CATEGORIES[4].tools[0],
]);
