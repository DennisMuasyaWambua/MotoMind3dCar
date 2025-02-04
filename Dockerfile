# Use official Node.js image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy project files
COPY . .

# Install `serve` globally
RUN npm install -g serve

# Expose port 3000 (default for serve)
EXPOSE 3000

# Run the project using `npx serve`
CMD ["npx","serve"]
