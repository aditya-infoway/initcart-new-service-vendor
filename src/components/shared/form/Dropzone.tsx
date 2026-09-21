// Import Dependencies
import { useDropzone } from "react-dropzone";
import { CloudArrowUpIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

// Local Imports
import { useListState } from "@/hooks";
import { Button, Upload } from "@/components/ui";
import { FileItem } from "@/components/shared/form/FileItem";

// ----------------------------------------------------------------------

interface DropzoneProps {
  onFilesChange?: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  label?: string;
  description?: string;
}

const Dropzone = ({ 
  onFilesChange, 
  accept = { "image/*": [".png", ".jpeg", ".jpg", ".webp"] },
  maxFiles = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  label = "Upload Files",
  description = "You can upload .png, .jpg, .jpeg and .webp file formats."
}: DropzoneProps) => {
  const [files, { remove, append }] = useListState<File>();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const newFiles = [...files, ...acceptedFiles];
      append(...acceptedFiles);
      onFilesChange?.(newFiles);
    },
    accept,
    maxFiles,
    maxSize,
  });

  return (
    <div>
      <p className="font-medium text-gray-800 dark:text-dark-100">
        {label}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
        {description}
      </p>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <Button
          unstyled
          className={clsx(
            "mt-3 w-full shrink-0 flex-col rounded-lg border-2 border-dashed py-10 transition-colors",
            isDragActive
              ? "border-primary-600 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20"
              : "border-gray-300 dark:border-dark-450 hover:border-gray-400 dark:hover:border-dark-400"
          )}
        >
          <CloudArrowUpIcon className={clsx(
            "size-12",
            isDragActive ? "text-primary-600 dark:text-primary-400" : "text-gray-400 dark:text-dark-300"
          )} />
          <span
            className={clsx(
              "pointer-events-none mt-2 text-sm",
              isDragActive
                ? "text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-dark-200"
            )}
          >
            <span className="text-primary-600 dark:text-primary-400 font-medium">
              Browse
            </span>
            <span> or drop your files here</span>
          </span>
        </Button>
      </div>
      <div className="mt-4 flex flex-col space-y-4">
        {files.map((file, index) => (
          <FileItem
            handleRemove={() => {
              remove(index);
              const newFiles = files.filter((_, i) => i !== index);
              onFilesChange?.(newFiles);
            }}
            file={file}
            key={index}
          />
        ))}
      </div>
    </div>
  );
};

export { Dropzone };
