import { AlbumCard } from "./AlbumCard";
import type { Album } from "./types";

interface AlbumGridProps {
	albums: Album[];
	isAdmin: boolean;
	onOpen: (album: Album) => void;
	onEditAlbum: (album: Album) => void;
	onDelete: (title: string, isAlbum?: boolean) => void;
}

export const AlbumGrid = ({
	albums,
	isAdmin,
	onOpen,
	onEditAlbum,
	onDelete,
}: AlbumGridProps) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{albums.map((album) => (
				<AlbumCard
					key={album.title}
					album={album}
					displayTitle={album.title.split("/").pop() || album.title}
					isAdmin={isAdmin}
					onOpen={onOpen}
					onEditAlbum={onEditAlbum}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
};
