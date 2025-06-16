# AI Agents Research Group - Paper Management System

A simple, GitHub Pages-hosted web application for managing research paper reading groups. This system allows lab members to upload papers, schedule discussions, and maintain an organized repository of research materials.

## Features

- 📤 **Paper Upload**: Web interface for uploading research papers
- 📅 **Schedule Management**: Visual calendar and list views of paper discussions
- 📚 **Track Organization**: Separate tracks for discussion papers, reference materials, and archived content
- 🔍 **Search & Browse**: Searchable paper database with filtering capabilities
- 🔐 **GitHub Authentication**: Secure access using GitHub OAuth
- 🤖 **Automated Workflows**: GitHub Actions for paper management and deployment
- 📱 **Responsive Design**: Mobile-friendly interface

## System Architecture

### Frontend
- Static HTML/CSS/JavaScript hosted on GitHub Pages
- Modern, responsive design with Font Awesome icons
- Client-side search and filtering
- GitHub OAuth integration for authentication

### Backend
- GitHub repository for paper storage and version control
- JSON files for schedule and configuration data
- GitHub Actions workflows for automation
- GitHub Pages for free hosting
- Github Actions for authentication see [this example repo](https://github.com/austenstone/github-actions-oauth) for more details

### File Structure
```
├── index.html              # Homepage with next paper and overview
├── upload.html             # Paper upload interface
├── browse.html             # Paper browsing and search
├── schedule.html           # Schedule management and calendar
├── papers/                 # PDF storage by track
│   ├── discussion/         # Papers scheduled for discussion
│   ├── reference/          # Reference and background papers
│   └── archived/           # Previously discussed papers
├── schedule/
│   └── schedule.json       # Meeting schedule data
├── tracks/
│   └── config.json         # Track configuration and settings
├── src/
│   ├── css/styles.css      # Main stylesheet
│   └── js/                 # JavaScript modules
├── .github/workflows/      # GitHub Actions automation
└── README.md
```

## Getting Started

### Prerequisites
- GitHub repository with Pages enabled
- GitHub OAuth App (for authentication)
- Basic knowledge of GitHub Actions

### Installation

1. **Fork or Clone this repository**
   ```bash
   git clone https://github.com/yourusername/agents-group-papers.git
   cd agents-group-papers
   ```

2. **Enable GitHub Pages**
   - Go to Settings → Pages in your GitHub repository
   - Select "Deploy from a branch" 
   - Choose "main" branch and "/ (root)" folder
   - Save the settings

3. **Configure GitHub OAuth** (Optional but recommended)
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create a new OAuth App
   - Set Authorization callback URL to: `https://yourusername.github.io/agents-group-papers/`
   - Update `src/js/auth.js` with your Client ID

4. **Customize Configuration**
   - Edit `tracks/config.json` to match your group's needs
   - Update group name, meeting times, and track settings
   - Modify initial schedule in `schedule/schedule.json`

5. **Deploy**
   - Push changes to the main branch
   - GitHub Actions will automatically deploy to Pages

### Usage

#### Uploading Papers
1. Navigate to the Upload page
2. Log in with GitHub (if authentication is enabled)
3. Fill out the paper details:
   - Title and authors
   - Track (discussion, reference)
   - Description and discussion date
4. Upload PDF file
5. Submit - the paper will be automatically committed to the repository

#### Managing Schedule
1. Go to the Schedule page
2. View upcoming discussions in list or calendar format
3. Add papers to the discussion schedule
4. Export schedule to calendar applications

#### Browsing Papers
1. Use the Browse page to search through all papers
2. Filter by track or search by title/author
3. Download papers directly from the interface
4. View paper details and discussion information

## Customization

### Styling
- Edit `src/css/styles.css` to customize the appearance
- The design uses CSS Grid and Flexbox for responsive layout
- Color scheme and fonts can be easily modified

### Functionality
- JavaScript modules in `src/js/` handle different page functionality
- `api.js` manages data operations and GitHub integration
- `auth.js` handles GitHub OAuth authentication
- Each page has its own JavaScript file for specific features

### Tracks and Categories
- Modify `tracks/config.json` to add or change paper categories
- Each track has configurable name, description, color, and icon
- Add new tracks by creating folders in `papers/` directory

## GitHub Actions Workflows

### Upload Paper Workflow
- Triggered by web interface or manually
- Commits PDF files to appropriate directories
- Updates schedule JSON with new paper metadata
- Supports all paper tracks and metadata

### Update Schedule Workflow
- Manages schedule changes and paper status updates
- Moves papers between tracks (e.g., reference → discussion)
- Updates presenter information and dates
- Archives completed discussions

### Deploy Workflow
- Automatically deploys to GitHub Pages on push to main
- Builds and publishes the static site
- Handles all assets and file routing

## Data Storage

### Schedule Format
```json
{
  "schedule": [
    {
      "id": "unique-identifier",
      "date": "2025-06-20",
      "title": "Paper Title",
      "authors": "Author Names",
      "track": "discussion",
      "presenter": "Presenter Name",
      "filename": "paper_file.pdf",
      "status": "upcoming",
      "description": "Paper description"
    }
  ],
  "lastUpdated": "2025-06-13"
}
```

### Track Configuration
```json
{
  "tracks": {
    "discussion": {
      "name": "Discussion Papers",
      "description": "Papers scheduled for group discussion",
      "color": "#3b82f6",
      "icon": "💬"
    }
  },
  "settings": {
    "groupName": "AI Agents Research Group",
    "meetingDay": "Friday",
    "meetingTime": "2:00 PM"
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For questions or issues:
1. Check the [Issues](https://github.com/yourusername/agents-group-papers/issues) page
2. Create a new issue with detailed description
3. Contact the maintainers

## Roadmap

- [ ] Email notifications for upcoming papers
- [ ] Integration with Slack/Discord
- [ ] Paper discussion notes and comments
- [ ] Reading progress tracking
- [ ] Integration with reference managers (Zotero, Mendeley)
- [ ] Advanced search with tags and categories
- [ ] Mobile app for paper reading

---

Built with ❤️ for research communities using GitHub Pages and Actions.
