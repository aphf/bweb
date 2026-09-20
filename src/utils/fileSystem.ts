export type FileType = "file" | "directory";

export interface FileSystemNode {
	type: FileType;
	content?: string;
	children?: { [key: string]: FileSystemNode };
	size?: number;
	lastModified?: number;
	author?: string;
	color?: string;
}

export type FileSystem = { [key: string]: FileSystemNode };

export const initialFileSystem: { [key: string]: FileSystemNode } = {
	home: {
		type: "directory",
		lastModified: 1762862400000,
		author: "root",
		children: {
			neo: {
				type: "directory",
				lastModified: 1762862400000,
				author: "neo",
				children: {
					".bashrc": {
						type: "file",
						content: `# Neosphere OS - Shell Configuration & Aliases
# Protected system configuration file (Read-only)

alias ask="ai"
alias tech="skills"
alias msg="send"
alias quit="exit"
alias stats="history"
alias twitter="x"
`,
						size: 154,
						lastModified: 1762862400000,
						author: "root",
					},
					"welcome.txt": {
						type: "file",
						content: 'Welcome to Neosphere v3.0. Type "help" to get started.',
						size: 55,
						lastModified: 1762862400000,
						author: "neo",
					},

					projects: {
						type: "directory",
						lastModified: 1762862400000,
						author: "neo",
						children: {
							"terminal_portfolio.txt": {
								type: "file",
								content:
									"Terminal Portfolio\n==================\n\nA retro-futuristic terminal interface built with React, TypeScript, and Tailwind CSS.\nFeatures a simulated file system, command history, and immersive CLI experience.\n\nTech Stack: React, TypeScript, Tailwind CSS\nRepository: https://github.com/bahauddin-alam",
								size: 295,
								lastModified: 1762862400000,
								author: "neo",
							},
						},
					},
					gallery: {
						type: "directory",
						lastModified: 1762862400000,
						author: "neo",
						children: {
							"photos.db": {
								type: "file",
								content: `SQLite format 3\0\x10\x00\x01\x01\x00@  \x00\x00\x00\x04\x00\x00\x00\x02
-- ====================================================================
-- SQLite 3 Database: photography.db (v3.42.0)
-- Page Size: 4096 bytes | Encoding: UTF-8 | Auto-Vacuum: None
-- ====================================================================

CREATE TABLE photos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    filename      TEXT UNIQUE NOT NULL,
    camera_model  TEXT DEFAULT 'Alpha A7 IV',
    lens          TEXT,
    focal_length  TEXT,
    aperture      TEXT,
    shutter_speed TEXT,
    iso           INTEGER,
    capture_date  DATETIME,
    gps_lat       REAL,
    gps_lng       REAL,
    raw_blob      BLOB
);

CREATE TABLE albums (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    cover_photo_id INTEGER REFERENCES photos(id)
);

CREATE INDEX idx_photos_date ON photos(capture_date DESC);
CREATE INDEX idx_photos_camera ON photos(camera_model, lens);

-- Note: Binary JPEG/RAW payloads are stored in raw_blob chunks.
-- Interactive album viewer & high-res gallery available at: /gallery`,
								size: 4096,
								lastModified: 1762862400000,
								author: "neo",
							},
						},
					},
					about: {
						type: "directory",
						lastModified: 1762862400000,
						author: "neo",
						children: {
							"me.txt": {
								type: "file",
								content:
									"I'm Bahauddin Alam, a Full Stack Developer based in Patna, India. Specializing in React, TypeScript, Node.js, and Python.",
								size: 124,
								lastModified: 1762862400000,
								author: "neo",
							},
						},
					},
					contact: {
						type: "directory",
						lastModified: 1762862400000,
						author: "neo",
						children: {
							"email.txt": {
								type: "file",
								content: "contact@bahauddin.org",
								size: 21,
								lastModified: 1762862400000,
								author: "neo",
							},
						},
					},
					visitors_notes: {
						type: "directory",
						lastModified: 1762862400000,
						author: "neo",
						children: {},
					},
					public: {
						type: "directory",
						lastModified: 1762862400000,
						author: "neo",
						children: {
							"readme.txt": {
								type: "file",
								content:
									"Welcome to ~/public!\n\nThis is a persistent folder. Everything you create here is saved.\nYou can create and manage files and nested directories using mkdir, touch, cp, mv, nano, cat, and rm.",
								size: 195,
								lastModified: 1762862400000,
								author: "neo",
							},
						},
					},
				},
			},
		},
	},
};
