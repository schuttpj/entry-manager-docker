# Snag List Management Web App

A locally hosted, single-page application designed for secure and efficient management of snag lists. This application allows users to upload photos, annotate them, and organize them with descriptions, voice comments, and filters.

## Features

- 📸 Photo Upload with Auto-numbering
- 🎯 Annotation Tools
- 🔍 Search and Filter Capabilities
- 📱 Responsive Design
- 🌓 Dark Mode Support
- 💾 Local Storage (IndexedDB)
- 📊 Project Organization
- 🔒 Offline-First Architecture

## Tech Stack

- Next.js 13+ (App Router)
- TypeScript
- Tailwind CSS
- IndexedDB (via idb)
- Shadcn/ui Components

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/snag-list2.git
   cd snag-list2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
snag-list2/
├── app/                # Next.js app router files
├── components/         # React components
├── lib/               # Utility functions and database
├── public/            # Static files
└── types/             # TypeScript type definitions
```

## Database Schema

The application uses IndexedDB with the following stores:

- **Projects**: Stores project information
  - id: string
  - name: string
  - createdAt: Date
  - updatedAt: Date

- **Snags**: Stores snag information
  - id: string
  - projectName: string
  - snagNumber: number
  - description: string
  - photoPath: string
  - priority: 'Low' | 'Medium' | 'High'
  - status: 'Open' | 'In Progress' | 'Completed'
  - assignedTo: string
  - createdAt: Date
  - updatedAt: Date
  - annotations: Annotation[]

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 