export interface Photo {
	url: string;
	caption: string;
	key: string;
}

export interface Album {
	title: string;
	count: number;
	cover: string[];
	photos: Photo[];
	category: string;
}
