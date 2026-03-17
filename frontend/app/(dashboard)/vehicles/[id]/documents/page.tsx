'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { vehicleApi } from '@/lib/api/vehicle';
import {
  vehicleDocumentApi,
  VehicleDocument,
  VehicleDocumentType,
  CreateVehicleDocumentDto,
} from '@/lib/api/vehicle-document';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastErrorFromException, toastSuccess } from '@/lib/utils';
import { FileText, Upload, Download, Trash2, Edit, MoreHorizontal } from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

const documentTypeLabels: Record<VehicleDocumentType, string> = {
  CRVL: 'CRVL',
  LICENSING: 'Licenciamento',
};

export default function VehicleDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const vehicleId = params.id as string;

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<VehicleDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<VehicleDocumentType>('CRVL');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehicleApi.getById(vehicleId),
  });

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['vehicle-documents', vehicleId],
    queryFn: () => vehicleDocumentApi.getAll(vehicleId),
  });

  const uploadMutation = useMutation({
    mutationFn: (data: { file: File; dto: CreateVehicleDocumentDto }) =>
      vehicleDocumentApi.upload(vehicleId, data.file, data.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] });
      toastSuccess('Documento enviado com sucesso');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDescription('');
      setExpiryDate('');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao enviar documento');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; description: string; expiryDate?: string }) =>
      vehicleDocumentApi.update(vehicleId, data.id, {
        description: data.description,
        expiryDate: data.expiryDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] });
      toastSuccess('Documento atualizado com sucesso');
      setEditDialogOpen(false);
      setEditingDocument(null);
      setDescription('');
      setExpiryDate('');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao atualizar documento');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleDocumentApi.delete(vehicleId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] });
      toastSuccess('Documento excluído com sucesso');
    },
    onError: (error) => {
      toastErrorFromException(error, 'Erro ao excluir documento');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toastErrorFromException(
          new Error('Arquivo muito grande. Tamanho máximo: 10MB'),
          'Erro',
        );
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toastErrorFromException(new Error('Selecione um arquivo'), 'Erro');
      return;
    }

    if (!description.trim()) {
      toastErrorFromException(new Error('A descrição é obrigatória'), 'Erro');
      return;
    }

    const dto: CreateVehicleDocumentDto = {
      type: documentType,
      description: description.trim(),
      expiryDate: expiryDate || undefined,
    };

    uploadMutation.mutate({ file: selectedFile, dto });
  };

  const handleDownload = async (doc: VehicleDocument) => {
    try {
      const blob = await vehicleDocumentApi.download(vehicleId, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      toastErrorFromException(error, 'Erro ao baixar documento');
    }
  };

  const handleEdit = (doc: VehicleDocument) => {
    setEditingDocument(doc);
    setDescription(doc.description || '');
    setExpiryDate(doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '');
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingDocument) return;

    if (!description.trim()) {
      toastErrorFromException(new Error('A descrição é obrigatória'), 'Erro');
      return;
    }

    updateMutation.mutate({
      id: editingDocument.id,
      description: description.trim(),
      expiryDate: expiryDate || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este documento?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const columns = [
    {
      key: 'type',
      header: 'Tipo',
      render: (doc: VehicleDocument) => (
        <span className="font-medium text-foreground">
          {documentTypeLabels[doc.type]}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      render: (doc: VehicleDocument) => (
        <span className="text-muted-foreground">{doc.description || '-'}</span>
      ),
    },
    {
      key: 'fileSize',
      header: 'Tamanho',
      render: (doc: VehicleDocument) => (
        <span className="text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Data de Upload',
      render: (doc: VehicleDocument) => (
        <span className="text-muted-foreground">{formatDate(doc.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      className: 'text-right',
      render: (doc: VehicleDocument) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload(doc)}>
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(doc)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(doc.id)}
                className="text-destructive"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Documentos - ${vehicle?.plate || 'Carregando...'}`}
        subtitle="Gerencie os documentos do veículo (CRVL e Licenciamentos)"
        actions={
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Enviar Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Documento</DialogTitle>
                <DialogDescription>
                  Faça upload de um documento do veículo (CRVL ou Licenciamento)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Tipo de Documento</Label>
                  <SearchableSelect
                    id="type"
                    options={[
                      { value: 'CRVL', label: 'CRVL' },
                      { value: 'LICENSING', label: 'Licenciamento' },
                    ]}
                    value={documentType}
                    onChange={(value) => setDocumentType(value as VehicleDocumentType)}
                    placeholder="Selecione o tipo"
                  />
                </div>
                <div>
                  <Label htmlFor="file">Arquivo (PDF ou Imagem - Máx. 10MB)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="mt-2"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Descrição *</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: CRVL 2024"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiryDate">Data de Validade (opcional)</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || !description.trim() || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Dialog de Edição */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingDocument(null);
            setDescription('');
            setExpiryDate('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Atualize as informações do documento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-description">Descrição *</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: CRVL 2024"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-expiryDate">Data de Validade (opcional)</Label>
              <Input
                id="edit-expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingDocument(null);
                  setDescription('');
                  setExpiryDate('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!description.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {vehicleLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <SectionCard title="Informações do Veículo">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Placa</p>
                <p className="font-medium text-foreground">{vehicle?.plate}</p>
              </div>
              {vehicle?.brandName && (
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium text-foreground">{vehicle.brandName}</p>
                </div>
              )}
              {vehicle?.modelName && (
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium text-foreground">{vehicle.modelName}</p>
                </div>
              )}
              {vehicle?.year && (
                <div>
                  <p className="text-sm text-muted-foreground">Ano</p>
                  <p className="font-medium text-foreground">{vehicle.year}</p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Documentos">
            {documentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded" />
                ))}
              </div>
            ) : documents && documents.length > 0 ? (
              <DataTable
                data={documents}
                columns={columns}
                isLoading={documentsLoading}
                emptyMessage="Nenhum documento encontrado"
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum documento cadastrado para este veículo
                </p>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
