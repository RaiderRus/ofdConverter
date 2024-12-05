# OFD Converter

This is a web application for processing and converting OFD (Online Fiscal Data) Excel files. The application provides functionality to process Excel files with specific business logic transformations.

## Features

- Excel file processing with specific business logic
- Automatic calculation of daily totals
- Separation of data by tax types (ПАТЕНТ/УСН)
- Handling of return transactions
- Beautiful modern UI with Next.js

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backend Setup

The backend is built with FastAPI and requires Python 3.8+. To set up the backend:

1. Create and activate virtual environment:
```bash
python -m venv .venv
.venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install fastapi uvicorn pandas openpyxl python-multipart
```

3. Run the backend server:
```bash
cd backend
uvicorn main:app --reload
```

The backend will be available at [http://localhost:8000](http://localhost:8000).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
