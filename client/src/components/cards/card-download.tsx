export function CardDownload({
	children,
	status,
	isRemoving = false,
}: {
	children: React.ReactNode;
	isRemoving?: boolean;
	status: "completed" | "pendent";
}) {
	return (
		<div
			className={`
				flex space-x-2 justify-center max-w-sm w-full border-green-800 border-2 items-center py-2 px-3 font-semibold rounded-md
				transition-opacity duration-500 ease-in-out opacity-100
				${status === "pendent" ? "bg-[#646cff]" : "bg-green-500"}
				${isRemoving && "opacity-0"}
			`}
		>
			{children}
		</div>
	);
}
